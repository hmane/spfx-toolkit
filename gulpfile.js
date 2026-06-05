'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const gulp = require('gulp');

const ROOT_DIR = __dirname;
const CJS_OUT_DIR = path.join(ROOT_DIR, 'lib');
const GENERATED_PROXY_DIRS = ['components', 'hooks', 'types', 'utilities', 'utils'].map(dir =>
  path.join(ROOT_DIR, dir)
);

const BUILD_TARGETS = [
  {
    label: 'cjs',
    outDir: CJS_OUT_DIR,
    tsconfig: 'tsconfig.json',
    includeDeclarations: true,
  },
];

const STATIC_ASSET_GLOBS = [
  'src/**/*.{css,scss,json,svg,png,jpg,jpeg,gif,woff,woff2}',
  '!src/**/__tests__/**',
  '!src/**/README.md',
];

const DECLARATION_GLOBS = ['src/**/*.d.ts'];
const LIB_CASE_COMPATIBILITY_ALIASES = [
  {
    js: path.join(CJS_OUT_DIR, 'utilities', 'CssLoader.js'),
    dts: path.join(CJS_OUT_DIR, 'utilities', 'CssLoader.d.ts'),
    jsTarget: './CssLoader/index',
    dtsTarget: './CssLoader/index',
  },
  {
    js: path.join(CJS_OUT_DIR, 'utilities', 'cssLoader.js'),
    dts: path.join(CJS_OUT_DIR, 'utilities', 'cssLoader.d.ts'),
    jsTarget: './CssLoader/index',
    dtsTarget: './CssLoader/index',
  },
];

function runTSC({ project, watch = false, label }) {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32';
    const bin = isWindows ? 'npx.cmd' : 'npx';
    const args = ['tsc', '-p', project];

    if (watch) {
      args.push('--watch');
    }

    console.log(`[${label}] Running: ${bin} ${args.join(' ')}`);

    const ps = spawn(bin, args, {
      stdio: 'inherit',
      shell: isWindows,
    });

    ps.on('error', err => {
      reject(new Error(`[${label}] Failed to start TypeScript compiler: ${err.message}`));
    });

    if (watch) {
      ps.on('close', code => {
        if (code !== 0) {
          console.error(`[${label}] Watch process exited with code ${code}`);
        }
      });
      resolve(ps);
      return;
    }

    ps.on('close', code => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`[${label}] TypeScript compilation failed with code ${code}`));
    });
  });
}

function toPosixPath(value) {
  return value.split(path.sep).join('/');
}

async function clean() {
  console.log('Cleaning generated output...');

  [CJS_OUT_DIR, ...GENERATED_PROXY_DIRS].forEach(dir => {
    fs.rmSync(dir, { recursive: true, force: true });
  });
}

function copyAssetsToTarget(target) {
  const globs = target.includeDeclarations
    ? [...STATIC_ASSET_GLOBS, ...DECLARATION_GLOBS]
    : STATIC_ASSET_GLOBS;

  return function copyAssetsTask() {
    console.log(`[${target.label}] Copying assets...`);

    return gulp
      .src(globs, { base: 'src' })
      .pipe(gulp.dest(target.outDir));
  };
}

async function buildTypeScript() {
  console.log('Building TypeScript outputs...');
  await Promise.all(
    BUILD_TARGETS.map(target =>
      runTSC({ project: target.tsconfig, label: target.label })
    )
  );
  console.log('TypeScript outputs completed');
}

function validateBuild(done) {
  console.log('Validating build output...');

  const requiredFiles = [
    path.join(CJS_OUT_DIR, 'index.js'),
    path.join(CJS_OUT_DIR, 'index.d.ts'),
    path.join(CJS_OUT_DIR, 'components/index.js'),
    path.join(CJS_OUT_DIR, 'hooks/index.js'),
    path.join(CJS_OUT_DIR, 'utilities/index.js'),
    path.join(CJS_OUT_DIR, 'types/index.js'),
  ];

  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));

  if (missingFiles.length > 0) {
    missingFiles.forEach(file => {
      console.error(`Missing required file: ${file}`);
    });
    throw new Error(`Build validation failed: ${missingFiles.length} required files missing`);
  }

  console.log('Build validation passed');
  done();
}

function generateCompatibilityProxies(done) {
  console.log('Generating compatibility proxy entrypoints...');

  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
  const exportsMap = pkg.exports || {};

  const writeProxyPackage = (subpath, { main, types }) => {
    const proxyDir = path.join(ROOT_DIR, subpath);
    fs.mkdirSync(proxyDir, { recursive: true });

    const manifest = {
      main,
      types,
      private: true,
    };

    fs.writeFileSync(
      path.join(proxyDir, 'package.json'),
      `${JSON.stringify(manifest, null, 2)}\n`
    );
  };

  Object.entries(exportsMap).forEach(([exportKey, exportValue]) => {
    if (exportKey === '.' || exportKey === './lib/*') {
      return;
    }

    if (exportKey.includes('*')) {
      if (exportKey !== './utilities/context/pnpImports/*') {
        return;
      }

      const cjsDir = path.join(CJS_OUT_DIR, 'utilities/context/pnpImports');

      if (!fs.existsSync(cjsDir)) {
        return;
      }

      fs.readdirSync(cjsDir)
        .filter(file => file.endsWith('.js'))
        .forEach(file => {
          const baseName = file.replace(/\.js$/, '');
          const subpath = path.join('utilities', 'context', 'pnpImports', baseName);
          const proxyDir = path.join(ROOT_DIR, subpath);

          writeProxyPackage(subpath, {
            main: toPosixPath(path.relative(proxyDir, path.join(cjsDir, file))),
            types: toPosixPath(
              path.relative(proxyDir, path.join(cjsDir, `${baseName}.d.ts`))
            ),
          });
        });

      return;
    }

    const subpath = exportKey.replace(/^\.\//, '');
    const descriptor =
      typeof exportValue === 'string'
        ? { require: exportValue, import: exportValue, types: exportValue }
        : exportValue;

    if (!descriptor.require || !descriptor.import || !descriptor.types) {
      return;
    }

    const proxyDir = path.join(ROOT_DIR, subpath);

    writeProxyPackage(subpath, {
      main: toPosixPath(path.relative(proxyDir, path.join(ROOT_DIR, descriptor.require))),
      types: toPosixPath(path.relative(proxyDir, path.join(ROOT_DIR, descriptor.types))),
    });
  });

  console.log('Compatibility proxy entrypoints generated');
  done();
}

function generateLibCompatibilityAliases(done) {
  console.log('Generating lib compatibility aliases...');

  LIB_CASE_COMPATIBILITY_ALIASES.forEach(alias => {
    fs.mkdirSync(path.dirname(alias.js), { recursive: true });
    fs.writeFileSync(alias.js, `'use strict';\n\nmodule.exports = require('${alias.jsTarget}');\n`);
    fs.writeFileSync(alias.dts, `export * from '${alias.dtsTarget}';\n`);
  });

  console.log('Lib compatibility aliases generated');
  done();
}

function generateLibPackageJson(done) {
  console.log('Generating debug package manifests...');

  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));

  const manifests = [
    {
      outDir: CJS_OUT_DIR,
      body: {
        name: pkg.name,
        version: pkg.version,
        main: './index.js',
        types: './index.d.ts',
        sideEffects: pkg.sideEffects,
      },
    },
  ];

  manifests.forEach(({ outDir, body }) => {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'package.json'), `${JSON.stringify(body, null, 2)}\n`);
  });

  console.log('Debug package manifests generated');
  done();
}

async function watchTypeScript() {
  console.log('Starting TypeScript watch processes...');
  await Promise.all(
    BUILD_TARGETS.map(target =>
      runTSC({ project: target.tsconfig, watch: true, label: target.label })
    )
  );
}

function watchAssets() {
  console.log('Watching asset changes...');

  const assetGlobs = [...STATIC_ASSET_GLOBS, ...DECLARATION_GLOBS];

  return gulp.watch(
    assetGlobs,
    gulp.series(
      gulp.parallel(
        ...BUILD_TARGETS.map(target => copyAssetsToTarget(target)),
      ),
      generateCompatibilityProxies
    )
  );
}

async function watch() {
  await watchTypeScript();
  return watchAssets();
}

const build = gulp.series(
  clean,
  gulp.parallel(buildTypeScript, ...BUILD_TARGETS.map(target => copyAssetsToTarget(target))),
  validateBuild,
  generateLibCompatibilityAliases,
  generateCompatibilityProxies
);

const buildWithPackageJson = gulp.series(build, generateLibPackageJson);

exports.clean = clean;
exports.build = build;
exports.buildWithPackageJson = buildWithPackageJson;
exports.watch = gulp.series(
  clean,
  gulp.parallel(...BUILD_TARGETS.map(target => copyAssetsToTarget(target))),
  generateCompatibilityProxies,
  watch
);
exports.validate = validateBuild;
exports.default = build;
