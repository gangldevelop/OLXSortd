const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'manifest.xml');
const distPath = path.join(__dirname, '..', 'dist');
const distManifestPath = path.join(distPath, 'manifest.xml');

// Ensure dist directory exists
if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath, { recursive: true });
}

// Copy manifest to dist
fs.copyFileSync(manifestPath, distManifestPath);

console.log('Outlook manifest copied to dist/');
