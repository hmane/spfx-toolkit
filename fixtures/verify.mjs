#!/usr/bin/env node
/**
 * Phase 0 fixture verifier (additive, read-only w.r.t. toolkit source).
 *
 * Pipeline:
 *   1. Build + pack the toolkit -> spfx-toolkit-fixture.tgz at repo root.
 *   2. consumer-published: install the tarball + peers, webpack-build, measure.
 *   3. consumer-link: install peers, symlink the toolkit in (npm-link-equivalent),
 *      detect nested duplicate heavy deps, webpack-build, measure.
 *   4. Emit a deterministic report (printed + written to fixtures/last-verify-report.json).
 *
 * No toolkit source is modified. Each stage is wrapped so a single failure is
 * captured in the report rather than aborting the whole run.
 *
 * Run: npm run fixtures:verify   (Node 22.14)
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, rmSync, lstatSync, mkdirSync, symlinkSync, readdirSync, renameSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURES_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(FIXTURES_DIR, '..');
const PUBLISHED = join(FIXTURES_DIR, 'consumer-published');
const LINK = join(FIXTURES_DIR, 'consumer-link');
const TARBALL = join(ROOT, 'spfx-toolkit-fixture.tgz');
const HEAVY_DEPS = ['devextreme', 'devextreme-react', '@fluentui/react', '@pnp/sp', '@pnp/spfx-controls-react'];
const CSS_MARKER = '--spfx-card'; // a Card.css :root custom property; presence proves toolkit CSS bundled

const report = { node: process.version, generatedAtNote: 'timestamps omitted for deterministic diffs', stages: {} };

function sh(cmd, cwd, label) {
  try {
    const out = execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: (e.stdout || '') + '\n' + (e.stderr || e.message || '').toString().slice(0, 4000) };
  }
}

function fileSize(p) { try { return existsSync(p) ? readFileSync(p).length : null; } catch { return null; } }

function assetSizesFromStats(statsPath) {
  // webpack `--json <file>` writes the full stats object. Pull asset sizes.
  try {
    const stats = JSON.parse(readFileSync(statsPath, 'utf8'));
    const sizes = {};
    for (const a of stats.assets || []) sizes[a.name] = a.size;
    return sizes;
  } catch { return null; }
}

/** A webpack build is "clean" only if stats has zero errors (exit code is unreliable with --json). */
function statsErrors(statsPath) {
  try {
    const stats = JSON.parse(readFileSync(statsPath, 'utf8'));
    const errs = (stats.errors || []).map(e => (typeof e === 'string' ? e : (e.message || ''))).filter(Boolean);
    return errs;
  } catch { return null; }
}

/** Count distinct physical copies of a dep in a fixture's resolved module graph (from stats modules). */
function duplicateCopiesFromStats(statsPath, depName) {
  try {
    const stats = JSON.parse(readFileSync(statsPath, 'utf8'));
    const roots = new Set();
    const needle = `/node_modules/${depName}/`;
    for (const m of stats.modules || []) {
      const id = m.identifier || m.name || '';
      const i = id.lastIndexOf(needle);
      if (i >= 0) roots.add(id.slice(0, i + needle.length));
    }
    return roots.size;
  } catch { return null; }
}

function cssBundled(distDir) {
  // style-loader inlines CSS text into the JS bundle; search emitted JS for the marker.
  try {
    for (const f of readdirSync(distDir)) {
      if (f.endsWith('.js') && readFileSync(join(distDir, f), 'utf8').includes(CSS_MARKER)) return true;
    }
  } catch { /* ignore */ }
  return false;
}

// ---- Stage 1: build + pack toolkit ---------------------------------------
{
  const stage = { };
  const build = sh('npm run build', ROOT);
  stage.build = build.ok;
  if (!build.ok) stage.buildError = build.out.slice(-1500);
  // pack -> deterministic filename
  if (existsSync(TARBALL)) rmSync(TARBALL);
  const pack = sh('npm pack --silent', ROOT);
  if (pack.ok) {
    const tgz = pack.out.trim().split('\n').pop().trim();
    const produced = join(ROOT, tgz);
    if (existsSync(produced)) { renameSync(produced, TARBALL); stage.tarball = 'spfx-toolkit-fixture.tgz'; }
    else stage.tarball = null;
  } else { stage.packError = pack.out.slice(-1500); }
  report.stages.toolkit = stage;
}

// ---- Stage 2: published-style fixture ------------------------------------
{
  const stage = {};
  rmSync(join(PUBLISHED, 'node_modules'), { recursive: true, force: true });
  rmSync(join(PUBLISHED, 'dist'), { recursive: true, force: true });
  rmSync(join(PUBLISHED, 'stats.json'), { force: true });
  // Remove the lockfile: it pins the previous tarball's integrity, which makes
  // npm restore stale toolkit content even after the tarball is rebuilt.
  rmSync(join(PUBLISHED, 'package-lock.json'), { force: true });
  const install = sh('npm install --no-audit --no-fund', PUBLISHED);
  stage.install = install.ok;
  if (!install.ok) stage.installError = install.out.slice(-2000);
  if (install.ok) {
    sh('npm run build', PUBLISHED);
    const statsPath = join(PUBLISHED, 'stats.json');
    const errs = statsErrors(statsPath);
    stage.webpackBuild = Array.isArray(errs) && errs.length === 0;
    stage.errorCount = Array.isArray(errs) ? errs.length : null;
    if (errs && errs.length) stage.firstErrors = errs.slice(0, 5).map(e => e.split('\n')[0]);
    stage.assetSizes = assetSizesFromStats(statsPath);
    stage.cardOnlyBytes = stage.assetSizes ? stage.assetSizes['light.js'] : null;
    stage.pnpFeatureBytes = stage.assetSizes ? stage.assetSizes['app.js'] : null;
    stage.cssBundled = cssBundled(join(PUBLISHED, 'dist'));
    stage.heavyDepCopies = Object.fromEntries(HEAVY_DEPS.map(d => [d, duplicateCopiesFromStats(statsPath, d)]));
    stage.noExtraConfigNeeded = stage.webpackBuild; // built clean with the committed minimal tsconfig/webpack
  }
  report.stages.published = stage;
}

// ---- Stage 3: npm-link-equivalent fixture --------------------------------
{
  const stage = {};
  rmSync(join(LINK, 'node_modules'), { recursive: true, force: true });
  rmSync(join(LINK, 'dist'), { recursive: true, force: true });
  rmSync(join(LINK, 'stats.json'), { force: true });
  rmSync(join(LINK, 'package-lock.json'), { force: true });
  const install = sh('npm install --no-audit --no-fund', LINK);
  stage.install = install.ok;
  if (!install.ok) stage.installError = install.out.slice(-2000);
  if (install.ok) {
    // npm-link-equivalent: symlink the toolkit (with its own node_modules) into the consumer.
    const linkTarget = join(LINK, 'node_modules', 'spfx-toolkit');
    try { rmSync(linkTarget, { recursive: true, force: true }); } catch { /* ignore */ }
    mkdirSync(dirname(linkTarget), { recursive: true });
    symlinkSync(ROOT, linkTarget, 'dir');
    stage.symlinked = lstatSync(linkTarget).isSymbolicLink();

    // Filesystem duplication detection: heavy dep present BOTH at consumer top-level
    // AND inside the linked toolkit's node_modules => webpack would bundle two copies.
    stage.duplicationPrecondition = {};
    for (const d of HEAVY_DEPS) {
      const atConsumer = existsSync(join(LINK, 'node_modules', d));
      const atToolkitNested = existsSync(join(ROOT, 'node_modules', d));
      stage.duplicationPrecondition[d] = { atConsumer, atToolkitNested, duplicated: atConsumer && atToolkitNested };
    }

    sh('npm run build', LINK);
    const statsPath = join(LINK, 'stats.json');
    const errs = statsErrors(statsPath);
    stage.webpackBuild = Array.isArray(errs) && errs.length === 0;
    stage.errorCount = Array.isArray(errs) ? errs.length : null;
    if (errs && errs.length) stage.firstErrors = errs.slice(0, 5).map(e => e.split('\n')[0]);
    stage.assetSizes = assetSizesFromStats(statsPath);
    stage.cardOnlyBytes = stage.assetSizes ? stage.assetSizes['light.js'] : null;
    stage.pnpFeatureBytes = stage.assetSizes ? stage.assetSizes['app.js'] : null;
    stage.cssBundled = cssBundled(join(LINK, 'dist'));
    stage.heavyDepCopiesInBundle = Object.fromEntries(HEAVY_DEPS.map(d => [d, duplicateCopiesFromStats(statsPath, d)]));
  }
  report.stages.link = stage;
}

writeFileSync(join(FIXTURES_DIR, 'last-verify-report.json'), JSON.stringify(report, null, 2) + '\n');

// ---- Deterministic summary -----------------------------------------------
const p = report.stages.published, l = report.stages.link;
console.log('\n================ fixtures:verify summary ================');
console.log('node:', report.node);
console.log('toolkit build/pack:', report.stages.toolkit.build ? 'ok' : 'FAIL', '/', report.stages.toolkit.tarball || 'no-tarball');
console.log('\n[published-style]');
console.log('  install/build:', p.install ? 'ok' : 'FAIL', '/', p.webpackBuild ? 'ok' : 'FAIL');
console.log('  no-extra-config build:', p.noExtraConfigNeeded === true);
console.log('  card-only bytes (baseline):', p.cardOnlyBytes);
console.log('  pnp-feature bytes (baseline):', p.pnpFeatureBytes);
console.log('  toolkit CSS bundled:', p.cssBundled);
console.log('  heavy-dep copies in bundle:', JSON.stringify(p.heavyDepCopies));
console.log('\n[npm-link]');
console.log('  install/build:', l.install ? 'ok' : 'FAIL', '/', l.webpackBuild ? 'ok' : (l.symlinked ? 'FAIL/skipped' : 'n/a'));
console.log('  duplication precondition:', JSON.stringify(l.duplicationPrecondition));
console.log('  heavy-dep copies in bundle:', JSON.stringify(l.heavyDepCopiesInBundle));
console.log('  card-only bytes:', l.cardOnlyBytes, '| pnp-feature bytes:', l.pnpFeatureBytes);
console.log('\nfull report -> fixtures/last-verify-report.json');
console.log('=========================================================\n');

// ---- Gate: fail the process if any required assertion failed --------------
const t = report.stages.toolkit;
const failures = [];
if (t.build !== true) failures.push('toolkit build failed');
if (!t.tarball) failures.push('toolkit pack produced no tarball');
if (p.install !== true) failures.push('published fixture install failed');
if (p.webpackBuild !== true) failures.push(`published fixture webpack build had errors (${p.errorCount ?? '?'})`);
if (p.assetSizes == null) failures.push('published fixture produced no stats/assets');
if (p.cssBundled !== true) failures.push('toolkit CSS not bundled in published fixture');
if (p.noExtraConfigNeeded !== true) failures.push('published fixture required extra (non-minimal) config to build');
if (l.install !== true) failures.push('npm-link fixture install failed');
if (l.symlinked !== true) failures.push('npm-link fixture symlink not created');
if (l.webpackBuild !== true) failures.push(`npm-link fixture webpack build had errors (${l.errorCount ?? '?'})`);
if (l.assetSizes == null) failures.push('npm-link fixture produced no stats/assets');

report.gate = { passed: failures.length === 0, failures };
writeFileSync(join(FIXTURES_DIR, 'last-verify-report.json'), JSON.stringify(report, null, 2) + '\n');

if (failures.length > 0) {
  console.log('GATE: FAIL');
  for (const f of failures) console.log('  ✗ ' + f);
  console.log('');
  process.exitCode = 1;
} else {
  console.log('GATE: PASS (all required assertions met)\n');
}
