const fs = require('fs');
const path = require('path');

// 1. Process all JSX files to remove framer-motion
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('framer-motion')) return;
  
  // Remove import
  content = content.replace(/import\s*\{[^}]*\}\s*from\s*['"]framer-motion['"];?[\r\n]*/g, '');
  
  // Replace <motion.div ...> with <div ...>
  content = content.replace(/<motion\.([a-zA-Z0-9]+)/g, '<$1');
  content = content.replace(/<\/motion\.([a-zA-Z0-9]+)>/g, '</$1>');
  
  // Remove <AnimatePresence> wrappers (replace with fragment)
  content = content.replace(/<AnimatePresence[^>]*>/g, '<>');
  content = content.replace(/<\/AnimatePresence>/g, '</>');
  
  // Remove framer-motion props
  const propsToRemove = ['initial', 'animate', 'exit', 'variants', 'transition', 'whileTap', 'whileHover', 'layoutId'];
  
  propsToRemove.forEach(prop => {
    // string props
    content = content.replace(new RegExp(`\\s+${prop}=['"][^'"]*['"]`, 'g'), '');
    // boolean props
    content = content.replace(new RegExp(`\\s+${prop}(?=\\s|>)`, 'g'), '');
    // object props (simple nesting support)
    let regexObj = new RegExp(`\\s+${prop}=\\{[^{}]*(\\{[^{}]*\\}[^{}]*)*\\}`, 'g');
    content = content.replace(regexObj, '');
  });
  
  fs.writeFileSync(filePath, content);
}

function walk(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) walk(fullPath);
    else if (fullPath.endsWith('.jsx')) processFile(fullPath);
  });
}

walk(path.join(__dirname, '../src'));

// 2. Remove PWA & InstallBanner specific stuff
const appLayoutPath = path.join(__dirname, '../src/layouts/AppLayout.jsx');
if (fs.existsSync(appLayoutPath)) {
  let appLayout = fs.readFileSync(appLayoutPath, 'utf8');
  appLayout = appLayout.replace(/<InstallBanner \/>/g, '');
  appLayout = appLayout.replace(/import InstallBanner[^\n]+\n/g, '');
  fs.writeFileSync(appLayoutPath, appLayout);
}

const appJsxPath = path.join(__dirname, '../src/App.jsx');
if (fs.existsSync(appJsxPath)) {
  let appJsx = fs.readFileSync(appJsxPath, 'utf8');
  appJsx = appJsx.replace(/const \{ installPrompt, setInstallPrompt \} = useApp\(\);\s*/g, '');
  appJsx = appJsx.replace(/useEffect\(\(\) => \{[\s\S]*?\}, \[setInstallPrompt\]\);\s*/g, '');
  fs.writeFileSync(appJsxPath, appJsx);
}

const viteConfigPath = path.join(__dirname, '../vite.config.js');
const viteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': '/src' } },
  server: { port: 5173, host: true },
});
`;
fs.writeFileSync(viteConfigPath, viteConfig);

console.log('Simplified architecture successfully.');
