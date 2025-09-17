'use strict';

const gulp = require('gulp');
const { spawn } = require('child_process');
const del = require('del');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'lib');

// ---------- helpers ----------
function runTSC({ watch = false } = {}) {
  return new Promise((resolve, reject) => {
    // More robust way to find TypeScript compiler
    let bin;
    let args = ['-p', 'tsconfig.json'];
    
    if (watch) args.push('--watch');

    // Try to use npx first (most reliable cross-platform)
    if (process.platform === 'win32') {
      bin = 'npx.cmd';
      args = ['tsc', ...args];
    } else {
      bin = 'npx';
      args = ['tsc', ...args];
    }

    console.log(`Running: ${bin} ${args.join(' ')}`);

    const ps = spawn(bin, args, { 
      stdio: 'inherit',
      shell: process.platform === 'win32' // Use shell on Windows for better compatibility
    });

    ps.on('error', (err) => {
      console.error('Failed to start TypeScript compiler:', err.message);
      
      // Fallback: try direct tsc command
      const fallbackBin = process.platform === 'win32' ? 'tsc.cmd' : 'tsc';
      const fallbackArgs = ['-p', 'tsconfig.json'];
      if (watch) fallbackArgs.push('--watch');
      
      console.log(`Trying fallback: ${fallbackBin} ${fallbackArgs.join(' ')}`);
      
      const fallbackPs = spawn(fallbackBin, fallbackArgs, { 
        stdio: 'inherit',
        shell: process.platform === 'win32'
      });
      
      fallbackPs.on('close', code => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`TypeScript compilation failed with code ${code}`));
        }
      });

      fallbackPs.on('error', (fallbackErr) => {
        reject(new Error(`Both npx and direct tsc commands failed. Original error: ${err.message}, Fallback error: ${fallbackErr.message}`));
      });
    });

    ps.on('close', code => {
      if (code === 0) {
        resolve();
      } else if (!watch) { // Don't reject in watch mode
        reject(new Error(`TypeScript compilation failed with code ${code}`));
      }
    });

    // In watch mode, keep the promise unresolved
    if (watch) {
      console.log('TypeScript compiler started in watch mode...');
    }
  });
}

function clean() {
  console.log('🧹 Cleaning output directory...');
  return del([`${OUT_DIR}/**/*`], { force: true });
}

// Copy assets (SCSS, CSS, JSON, etc.)
function copyAssets() {
  console.log('📁 Copying assets...');
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
  console.log('📦 Generating lib package.json...');
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
    try {
      fs.writeFileSync(path.join(OUT_DIR, 'package.json'), JSON.stringify(libPkg, null, 2));
      console.log('✅ Generated lib package.json');
      resolve();
    } catch (error) {
      console.error('❌ Failed to generate lib package.json:', error.message);
      throw error;
    }
  });
}

// Validate build output
function validateBuild() {
  console.log('🔍 Validating build output...');
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
    const missingFiles = [];
    
    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        missingFiles.push(file);
      }
    }

    if (missingFiles.length > 0) {
      console.error('❌ Missing required files:');
      missingFiles.forEach(file => console.error(`  - ${file}`));
      return reject(new Error(`Build validation failed: ${missingFiles.length} required files missing`));
    }

    console.log('✅ Build validation passed - all required files present');
    resolve();
  });
}

// ---------- tasks ----------
async function buildTS() {
  console.log('🔨 Building TypeScript...');
  await runTSC({ watch: false });
  console.log('✅ TypeScript build completed');
}

const build = gulp.series(clean, gulp.parallel(buildTS, copyAssets), validateBuild);

const buildWithPackageJson = gulp.series(build, generateLibPackageJson);

function watch() {
  console.log('👀 Starting watch mode...');
  
  // Start tsc in watch mode
  runTSC({ watch: true }).catch(err => {
    console.error('❌ TypeScript watch mode failed:', err.message);
    process.exitCode = 1;
  });

  // Watch and copy assets on change
  console.log('👀 Watching for asset changes...');
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
