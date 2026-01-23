#!/usr/bin/env bun

import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🔧 Running Hyperpro Sticker Generator setup...\n');

let hasErrors = false;

// Check if node_modules/xlsx exists
const xlsxModulePath = join(projectRoot, 'node_modules', 'xlsx');
if (!existsSync(xlsxModulePath)) {
  console.error('❌ Error: xlsx module not found in node_modules');
  console.error('   Please run: bun install');
  hasErrors = true;
  process.exit(1);
}

// Create vendor directory if it doesn't exist
const vendorDir = join(projectRoot, 'vendor');
if (!existsSync(vendorDir)) {
  try {
    mkdirSync(vendorDir, { recursive: true });
    console.log('✓ Created vendor directory');
  } catch (error) {
    console.error('❌ Error: Failed to create vendor directory');
    console.error(`   ${error.message}`);
    hasErrors = true;
  }
}

// Find and copy xlsx.full.min.js
const xlsxSourcePath = join(xlsxModulePath, 'dist', 'xlsx.full.min.js');
const xlsxDestPath = join(vendorDir, 'xlsx.full.min.js');

if (!existsSync(xlsxSourcePath)) {
  console.error('❌ Error: xlsx.full.min.js not found in node_modules/xlsx/dist/');
  console.error('   The xlsx package structure may have changed.');
  hasErrors = true;
} else {
  try {
    copyFileSync(xlsxSourcePath, xlsxDestPath);
    console.log('✓ Copied xlsx.full.min.js to vendor directory');
  } catch (error) {
    console.error('❌ Error: Failed to copy xlsx.full.min.js');
    console.error(`   ${error.message}`);
    hasErrors = true;
  }
}

// Validate data directory exists
const dataDir = join(projectRoot, 'data');
if (!existsSync(dataDir)) {
  console.warn('⚠️  Warning: data directory not found');
  console.warn('   The application may not work without product data.');
} else {
  console.log('✓ Data directory exists');
}

// Validate templates directory exists
const templatesDir = join(projectRoot, 'templates');
if (!existsSync(templatesDir)) {
  console.error('❌ Error: templates directory not found');
  console.error('   The application requires templates to generate labels.');
  hasErrors = true;
} else {
  console.log('✓ Templates directory exists');
}

// Summary
console.log('');
if (hasErrors) {
  console.error('❌ Setup completed with errors. Please fix the issues above.');
  process.exit(1);
} else {
  console.log('✅ Setup completed successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('  - Run: bun run dev');
  console.log('  - Open: http://localhost:3000');
  console.log('');
}
