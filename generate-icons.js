const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const generateIcon = (size) => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#22c55e'; // Tailwind green-500
  ctx.fillRect(0, 0, size, size);

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.floor(size * 0.4)}px Arial`;
  ctx.fillText('TLS', size / 2, size / 2);

  // Save
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(__dirname, 'frontend', 'public', `pwa-${size}x${size}.png`), buffer);
  console.log(`Generated pwa-${size}x${size}.png`);
};

try {
  generateIcon(192);
  generateIcon(512);
} catch (e) {
  console.error("Lỗi tạo ảnh. Hãy chắc chắn đã cài thư viện 'canvas'.", e);
}
