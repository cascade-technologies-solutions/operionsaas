import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import toIco from 'to-ico';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const sourceSvg = path.join(rootDir, 'docs', 'WhatsApp Image 2025-02-03 at 21.59.46_0219a9e4.svg');
const iconsDir = path.join(rootDir, 'public', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Sizes for PNG icons
const pngSizes = [72, 96, 128, 144, 152, 167, 180, 192, 512];

// Sizes for SVG icons (these will be copies with viewBox adjusted)
const svgSizes = [144, 192, 512];

// Favicon sizes (for ICO file)
const faviconSizes = [16, 32, 48];

async function generatePngIcons() {
  console.log('Generating PNG icons...');
  
  for (const size of pngSizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    
    try {
      await sharp(sourceSvg)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Generated icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`✗ Failed to generate icon-${size}x${size}.png:`, error.message);
    }
  }
}

async function generateSvgIcons() {
  console.log('Generating SVG icons...');
  
  // Read the source SVG
  const svgContent = fs.readFileSync(sourceSvg, 'utf-8');
  
  for (const size of svgSizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
    
    try {
      // Create a new SVG with the specified viewBox
      // Extract the viewBox from the original SVG or create a square one
      let newSvg = svgContent;
      
      // If the SVG has a viewBox, preserve it, otherwise create one
      if (!svgContent.includes('viewBox')) {
        // Try to extract width and height, or use default
        const widthMatch = svgContent.match(/width="([^"]+)"/);
        const heightMatch = svgContent.match(/height="([^"]+)"/);
        
        if (widthMatch && heightMatch) {
          newSvg = svgContent.replace(
            /<svg[^>]*>/,
            `<svg viewBox="0 0 ${widthMatch[1]} ${heightMatch[1]}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`
          );
        } else {
          // Default square viewBox
          newSvg = svgContent.replace(
            /<svg[^>]*>/,
            `<svg viewBox="0 0 1000 1000" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`
          );
        }
      } else {
        // Update width and height attributes while preserving viewBox
        newSvg = svgContent.replace(
          /<svg([^>]*)>/,
          (match, attrs) => {
            // Remove existing width and height
            attrs = attrs.replace(/\s*width="[^"]*"/gi, '');
            attrs = attrs.replace(/\s*height="[^"]*"/gi, '');
            return `<svg${attrs} width="${size}" height="${size}">`;
          }
        );
      }
      
      fs.writeFileSync(outputPath, newSvg, 'utf-8');
      console.log(`✓ Generated icon-${size}x${size}.svg`);
    } catch (error) {
      console.error(`✗ Failed to generate icon-${size}x${size}.svg:`, error.message);
    }
  }
}

async function generateFavicon() {
  console.log('Generating favicon.ico...');
  
  try {
    const faviconBuffers = [];
    
    for (const size of faviconSizes) {
      const buffer = await sharp(sourceSvg)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toBuffer();
      
      faviconBuffers.push(buffer);
    }
    
    // Convert PNG buffers to ICO format
    const icoBuffer = await toIco(faviconBuffers);
    
    const faviconPath = path.join(rootDir, 'public', 'favicon.ico');
    fs.writeFileSync(faviconPath, icoBuffer);
    
    console.log('✓ Generated favicon.ico');
  } catch (error) {
    console.error('✗ Failed to generate favicon.ico:', error.message);
  }
}

async function main() {
  console.log('Starting icon generation...\n');
  
  if (!fs.existsSync(sourceSvg)) {
    console.error(`Error: Source SVG not found at ${sourceSvg}`);
    process.exit(1);
  }
  
  await generatePngIcons();
  console.log('');
  await generateSvgIcons();
  console.log('');
  await generateFavicon();
  
  console.log('\n✓ All icons generated successfully!');
}

main().catch(console.error);

