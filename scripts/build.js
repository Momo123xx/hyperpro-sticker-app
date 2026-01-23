#!/usr/bin/env bun

import { existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🔍 Running Hyperpro Sticker Generator build validation...\n');

let hasErrors = false;
let hasWarnings = false;

// Helper to format file size
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Helper to check file exists and get size
function checkFile(filepath, description, required = true) {
  if (!existsSync(filepath)) {
    if (required) {
      console.error(`❌ Missing required file: ${description}`);
      console.error(`   Expected at: ${filepath}`);
      hasErrors = true;
    } else {
      console.warn(`⚠️  Optional file not found: ${description}`);
      hasWarnings = true;
    }
    return null;
  }

  const stats = statSync(filepath);
  const size = formatFileSize(stats.size);
  console.log(`✓ ${description} (${size})`);
  return stats.size;
}

// Check required HTML file
console.log('📄 HTML Files:');
checkFile(join(projectRoot, 'index.html'), 'index.html');
console.log('');

// Check CSS files
console.log('🎨 CSS Files:');
const cssDir = join(projectRoot, 'css');
if (existsSync(cssDir)) {
  const cssFiles = readdirSync(cssDir).filter(f => f.endsWith('.css'));
  cssFiles.forEach(file => {
    checkFile(join(cssDir, file), `css/${file}`);
  });
} else {
  console.error('❌ CSS directory not found');
  hasErrors = true;
}
console.log('');

// Check JavaScript files
console.log('📜 JavaScript Files:');
const jsDir = join(projectRoot, 'js');
if (existsSync(jsDir)) {
  const jsFiles = readdirSync(jsDir).filter(f => f.endsWith('.js'));
  jsFiles.forEach(file => {
    checkFile(join(jsDir, file), `js/${file}`);
  });
} else {
  console.error('❌ JavaScript directory not found');
  hasErrors = true;
}
console.log('');

// Check vendor XLSX library (critical for production)
console.log('📦 Vendor Libraries:');
const xlsxPath = join(projectRoot, 'vendor', 'xlsx.full.min.js');
if (!existsSync(xlsxPath)) {
  console.error('❌ CRITICAL: vendor/xlsx.full.min.js is missing!');
  console.error('   This file is required for production deployment.');
  console.error('   Run: bun run setup');
  hasErrors = true;
} else {
  checkFile(xlsxPath, 'vendor/xlsx.full.min.js');
}
console.log('');

// Check template files
console.log('📋 Template Files:');
const templatesDir = join(projectRoot, 'templates');
if (existsSync(templatesDir)) {
  const templateFiles = readdirSync(templatesDir).filter(f => f.endsWith('.txt'));
  templateFiles.forEach(file => {
    checkFile(join(templatesDir, file), `templates/${file}`);
  });

  if (templateFiles.length === 0) {
    console.error('❌ No template files found in templates directory');
    hasErrors = true;
  }
} else {
  console.error('❌ Templates directory not found');
  hasErrors = true;
}
console.log('');

// Check data directory
console.log('📊 Data Files:');
const dataDir = join(projectRoot, 'data');
if (existsSync(dataDir)) {
  const dataFiles = readdirSync(dataDir).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
  if (dataFiles.length > 0) {
    dataFiles.forEach(file => {
      checkFile(join(dataDir, file), `data/${file}`);
    });
  } else {
    console.warn('⚠️  No Excel files found in data directory');
    console.warn('   The application may not work without product data.');
    hasWarnings = true;
  }
} else {
  console.warn('⚠️  Data directory not found');
  hasWarnings = true;
}
console.log('');

// Check for common debugging code
console.log('🔍 Code Quality Checks:');
const jsFilesToCheck = existsSync(jsDir) ? readdirSync(jsDir).filter(f => f.endsWith('.js')) : [];
let debuggingCodeFound = false;

jsFilesToCheck.forEach(file => {
  const filepath = join(jsDir, file);
  const content = Bun.file(filepath).text();

  content.then(text => {
    if (text.includes('debugger;')) {
      console.warn(`⚠️  Found 'debugger;' statement in js/${file}`);
      debuggingCodeFound = true;
      hasWarnings = true;
    }
    // Note: console.log is often intentional, so we don't warn about it
  });
});

if (!debuggingCodeFound) {
  console.log('✓ No debugger statements found');
}
console.log('');

// Summary
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

if (hasErrors) {
  console.error('❌ Build validation FAILED');
  console.error('   Please fix the errors above before deploying.');
  console.log('');
  process.exit(1);
} else if (hasWarnings) {
  console.warn('⚠️  Build validation completed with warnings');
  console.warn('   Review the warnings above before deploying.');
  console.log('');
  console.log('Deployment checklist:');
  console.log('  1. Ensure all required files are present');
  console.log('  2. Copy all files to your deployment target');
  console.log('  3. Verify vendor/xlsx.full.min.js is included');
  console.log('  4. Test on production URL');
  console.log('');
  process.exit(0);
} else {
  console.log('✅ Build validation PASSED');
  console.log('');
  console.log('Ready for deployment! 🚀');
  console.log('');
  console.log('Deployment checklist:');
  console.log('  1. Copy all files to your deployment target');
  console.log('  2. Verify vendor/xlsx.full.min.js is included');
  console.log('  3. Test on production URL');
  console.log('');
  process.exit(0);
}
