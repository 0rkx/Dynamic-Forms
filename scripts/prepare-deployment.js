#!/usr/bin/env node

/**
 * Cloudflare Pages Deployment Preparation Script
 * This script helps prepare the project for deployment to Cloudflare Pages
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Preparing project for Cloudflare Pages deployment...\n');

// Check if required files exist
const requiredFiles = [
  'package.json',
  'vite.config.ts',
  '_redirects',
  '_headers',
  'env.example'
];

console.log('✅ Checking required files...');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✓ ${file} exists`);
  } else {
    console.log(`   ✗ ${file} missing`);
  }
});

// Check if .env file exists
if (fs.existsSync('.env')) {
  console.log('   ✓ .env file exists');
} else {
  console.log('   ⚠️  .env file missing - copy from env.example');
}

console.log('\n📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('   ✓ Dependencies installed');
} catch (error) {
  console.log('   ✗ Failed to install dependencies');
  process.exit(1);
}

console.log('\n🔨 Testing build process...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('   ✓ Build successful');
} catch (error) {
  console.log('   ✗ Build failed');
  process.exit(1);
}

console.log('\n📊 Checking bundle size...');
try {
  const distPath = path.join(__dirname, '../dist');
  const assetsPath = path.join(distPath, 'assets');
  
  if (fs.existsSync(assetsPath)) {
    const files = fs.readdirSync(assetsPath);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    const cssFiles = files.filter(f => f.endsWith('.css'));
    
    console.log(`   ✓ Generated ${jsFiles.length} JS files`);
    console.log(`   ✓ Generated ${cssFiles.length} CSS files`);
    
    // Check for large files
    jsFiles.forEach(file => {
      const filePath = path.join(assetsPath, file);
      const stats = fs.statSync(filePath);
      const sizeKB = Math.round(stats.size / 1024);
      
      if (sizeKB > 500) {
        console.log(`   ⚠️  Large JS file: ${file} (${sizeKB}KB)`);
      }
    });
  }
} catch (error) {
  console.log('   ⚠️  Could not analyze bundle size');
}

console.log('\n🌐 Environment variables check...');
const envExample = fs.readFileSync('env.example', 'utf8');
const envVars = envExample.match(/^[A-Z_]+=.+/gm) || [];
const clientVars = envVars.filter(v => v.startsWith('VITE_'));

console.log(`   ✓ Found ${envVars.length} total environment variables`);
console.log(`   ✓ Found ${clientVars.length} client-side variables (VITE_)`);

console.log('\n📋 Cloudflare Pages Configuration Summary:');
console.log('   Build command: npm run build');
console.log('   Build output: dist');
console.log('   Node.js version: 18+');
console.log('   Framework: Vite');

console.log('\n🎯 Next Steps:');
console.log('1. Commit your changes to Git');
console.log('2. Push to GitHub');
console.log('3. Connect your repository to Cloudflare Pages');
console.log('4. Configure environment variables in Cloudflare');
console.log('5. Deploy! 🚀');

console.log('\n✅ Deployment preparation complete!');
console.log('📚 See CLOUDFLARE_PAGES_DEPLOYMENT.md for detailed instructions.'); 