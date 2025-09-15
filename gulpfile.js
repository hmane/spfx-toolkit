'use strict';

const gulp = require('gulp');
const { spawn } = require('child_process');
const del = require('del');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'lib');

// ---------- helpers ----------
function runTSC({ watch = false } = {}) {
  return new Promise((resolve, reject) => {
    const bin = process.platform === 'win32' ? 'tsc.cmd' : 'tsc';
    const args = ['-p', 'tsconfig.json'];
    if (watch) args.push('--watch');

    const ps = spawn(bin, args, { stdio: 'inherit' });
    ps.on('close', code =>
      code === 0 ? resolve() : reject(new Error(`tsc exited with code ${code}`))
    );

    // In watch mode, keep the promise unresolved
    if (watch) {
      // Keep process alive for watch mode
    }
  });
}

function clean() {
  return del([`${OUT_DIR}/**/*`], { force: true });
}

// Copy assets (SCSS, CSS, JSON, etc.)
function copyAssets() {
  return gulp
    .src(
      [
        'src/**/*.{css,scss,json,svg,png,jpg,jpeg,gif,woff,woff2}',
        '!src/**/__tests__/**',
        '!src/**/README.md',
      ],
      {
        base: 'src',
      }
    )
    .pipe(gulp.dest(OUT_DIR));
}

// Generate package.json for lib directory (optional - for debugging)
function generateLibPackageJson() {
  const pkg = require('./package.json');
  const libPkg = {
    name: pkg.name,
    version: pkg.version,
    main: './index.js',
    types: './index.d.ts',
    sideEffects: pkg.sideEffects,
  };

  const fs = require('fs');
  return new Promise(resolve => {
    fs.writeFileSync(path.join(OUT_DIR, 'package.json'), JSON.stringify(libPkg, null, 2));
    resolve();
  });
}

// Validate build output
function validateBuild() {
  const fs = require('fs');
  const requiredFiles = [
    path.join(OUT_DIR, 'index.js'),
    path.join(OUT_DIR, 'index.d.ts'),
    path.join(OUT_DIR, 'components/index.js'),
    path.join(OUT_DIR, 'hooks/index.js'),
    path.join(OUT_DIR, 'utilities/index.js'),
    path.join(OUT_DIR, 'types/index.js'),
  ];

  return new Promise((resolve, reject) => {
    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        return reject(new Error(`Required file missing: ${file}`));
      }
    }
    console.log('✅ Build validation passed');
    resolve();
  });
}

// ---------- tasks ----------
async function buildTS() {
  await runTSC({ watch: false });
}

const build = gulp.series(clean, gulp.parallel(buildTS, copyAssets), validateBuild);

const buildWithPackageJson = gulp.series(build, generateLibPackageJson);

function watch() {
  // Start tsc in watch mode
  runTSC({ watch: true }).catch(err => {
    console.error(err);
    process.exitCode = 1;
  });

  // Watch and copy assets on change
  return gulp.watch(
    ['src/**/*.{css,scss,json,svg,png,jpg,jpeg,gif,woff,woff2}', '!src/**/__tests__/**'],
    gulp.series(copyAssets)
  );
}

// ---------- expose ----------
exports.clean = clean;
exports.build = build;
exports.buildWithPackageJson = buildWithPackageJson;
exports.watch = gulp.series(clean, copyAssets, watch);
exports.validate = validateBuild;
exports.default = build;
