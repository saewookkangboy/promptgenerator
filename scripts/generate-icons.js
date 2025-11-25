import sharp from 'sharp';
import { writeFileSync } from 'fs';

async function generateIcon(size, filename) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#000000" rx="${size * 0.12}"/>
      <text x="${size / 2}" y="${size * 0.7}" font-size="${size * 0.6}" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif">⌨️</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(`public/${filename}`);
  
  console.log(`Generated ${filename} (${size}x${size})`);
}

async function generateAllIcons() {
  try {
    await generateIcon(192, 'icon-192.png');
    await generateIcon(512, 'icon-512.png');
    await generateIcon(180, 'apple-touch-icon.png');
    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateAllIcons();

