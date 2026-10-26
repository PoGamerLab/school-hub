/**
 * Production build script (Phase B3).
 * Bundles CSS stylesheets, adjusts script/link references, copies assets to dist/.
 */

import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const version = (process.env.GITHUB_SHA || Date.now().toString()).slice(0, 8);
let html = fs.readFileSync('index.html', 'utf8');

// 1. Find all modular CSS stylesheet links in src/
const cssLinkRegex = /<link\s+rel=["']stylesheet["']\s+href=["'](src\/[^"']+\.css)["']\s*>/g;
const cssFiles = [];
let match;
while ((match = cssLinkRegex.exec(html)) !== null) {
  cssFiles.push({ tag: match[0], path: match[1] });
}

console.log(`Found ${cssFiles.length} modular stylesheet links.`);

// 2. Concatenate CSS files in order
let combinedCss = '';
for (const item of cssFiles) {
  if (fs.existsSync(item.path)) {
    combinedCss += `/* --- ${item.path} --- */\n` + fs.readFileSync(item.path, 'utf8') + '\n\n';
  } else {
    console.warn(`Warning: CSS file not found: ${item.path}`);
  }
}

fs.writeFileSync(path.join(distDir, 'styles.css'), combinedCss, 'utf8');
console.log(`Wrote bundled CSS to dist/styles.css (${(combinedCss.length / 1024).toFixed(1)} KB).`);

// 3. Replace the multiple CSS links with one bundle link in HTML
if (cssFiles.length > 0) {
  const firstTag = cssFiles[0].tag;
  html = html.replace(firstTag, `<link rel="stylesheet" href="styles.css?v=${version}">`);
  for (let i = 1; i < cssFiles.length; i++) {
    html = html.replace(cssFiles[i].tag, '');
  }
}

// 4. Replace main.js script with bundled app.js
html = html.replace(/src=["']src\/main\.js["']/, `src="app.js?v=${version}"`);

// 5. Write dist/index.html
fs.writeFileSync(path.join(distDir, 'index.html'), html, 'utf8');
console.log('Wrote dist/index.html.');

// 6. Copy images directory
const imagesSrc = path.resolve('images');
const imagesDest = path.join(distDir, 'images');
if (fs.existsSync(imagesSrc)) {
  fs.cpSync(imagesSrc, imagesDest, { recursive: true });
  console.log('Copied images/ to dist/images/.');
}

// 7. Write .nojekyll
fs.writeFileSync(path.join(distDir, '.nojekyll'), '', 'utf8');

// 8. Verify app.js external imports if present
const appJsPath = path.join(distDir, 'app.js');
if (fs.existsSync(appJsPath)) {
  const appJs = fs.readFileSync(appJsPath, 'utf8');
  const gstaticCount = (appJs.match(/gstatic\.com/g) || []).length;
  if (gstaticCount === 0) {
    console.error('ERROR: dist/app.js does not contain external gstatic imports!');
    process.exit(1);
  }
  console.log(`Verified dist/app.js: external gstatic imports present (${gstaticCount} references).`);
}

console.log('Build completed successfully.');
