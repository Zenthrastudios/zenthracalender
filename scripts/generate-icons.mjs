#!/usr/bin/env node
/**
 * Script to generate PWA icons from the existing logo
 * Run: node scripts/generate-icons.mjs
 * 
 * Prerequisites: npm install sharp
 */

import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const iconsDir = join(rootDir, 'public', 'icons');

// Ensure icons directory exists
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

// Icon sizes needed for PWA and iOS
const iconSizes = [
  // Standard PWA icons
  { name: 'icon-72.png', size: 72 },
  { name: 'icon-96.png', size: 96 },
  { name: 'icon-128.png', size: 128 },
  { name: 'icon-144.png', size: 144 },
  { name: 'icon-152.png', size: 152 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-384.png', size: 384 },
  { name: 'icon-512.png', size: 512 },
  // iOS apple-touch-icons
  { name: 'apple-touch-icon-72x72.png', size: 72 },
  { name: 'apple-touch-icon-76x76.png', size: 76 },
  { name: 'apple-touch-icon-114x114.png', size: 114 },
  { name: 'apple-touch-icon-120x120.png', size: 120 },
  { name: 'apple-touch-icon-144x144.png', size: 144 },
  { name: 'apple-touch-icon-152x152.png', size: 152 },
  { name: 'apple-touch-icon-180x180.png', size: 180 },
];

// Source icon - use the existing 512x512 webp icon
const sourceIcon = join(rootDir, 'icons', 'icon-512.webp');

async function generateIcons() {
  console.log('Generating PWA icons...');
  
  for (const { name, size } of iconSizes) {
    const outputPath = join(iconsDir, name);
    
    try {
      await sharp(sourceIcon)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 1 } // Black background
        })
        .png()
        .toFile(outputPath);
      
      console.log(`  Created: ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`  Error creating ${name}:`, error.message);
    }
  }
  
  console.log('\nIcon generation complete!');
  console.log('Icons saved to: public/icons/');
}

generateIcons().catch(console.error);
