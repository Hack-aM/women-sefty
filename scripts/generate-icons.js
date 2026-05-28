// Script to generate placeholder PNG icons using Canvas API (Node.js)
// Run: node scripts/generate-icons.js
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const outDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

sizes.forEach((size) => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#ec4899');
  grad.addColorStop(1, '#a855f7');

  // Rounded rect
  const r = size * 0.22;
  ctx.beginPath();
  ctx.moveTo(r, 0); ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size); ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Shield shape
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  const cx = size / 2, sy = size * 0.19, ey = size * 0.81;
  ctx.moveTo(cx, sy);
  ctx.lineTo(size * 0.75, size * 0.31);
  ctx.lineTo(size * 0.75, size * 0.53);
  ctx.bezierCurveTo(size * 0.75, size * 0.67, size * 0.63, size * 0.78, cx, ey);
  ctx.bezierCurveTo(size * 0.37, size * 0.78, size * 0.25, size * 0.67, size * 0.25, size * 0.53);
  ctx.lineTo(size * 0.25, size * 0.31);
  ctx.closePath();
  ctx.fill();

  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(outDir, `icon-${size}x${size}.png`), buf);
  console.log(`✓ Generated icon-${size}x${size}.png`);
});
console.log('All icons generated!');
