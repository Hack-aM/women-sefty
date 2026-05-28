const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach((s) => {
  const r = Math.round(s * 0.22);
  const cx = s / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="${s}" y2="${s}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ec4899"/>
      <stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
  </defs>
  <rect width="${s}" height="${s}" rx="${r}" fill="url(#grad)"/>
  <path d="M${cx} ${s * 0.19} L${s * 0.75} ${s * 0.31} L${s * 0.75} ${s * 0.53} C${s * 0.75} ${s * 0.67} ${s * 0.63} ${s * 0.78} ${cx} ${s * 0.81} C${s * 0.37} ${s * 0.78} ${s * 0.25} ${s * 0.67} ${s * 0.25} ${s * 0.53} L${s * 0.25} ${s * 0.31} Z" fill="white"/>
</svg>`;
  fs.writeFileSync(path.join(outDir, `icon-${s}x${s}.png`), svg);
  console.log('Generated icon-' + s + 'x' + s + '.png');
});

console.log('All icons generated in public/icons/');
