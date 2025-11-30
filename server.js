const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
// Explicitly set the project directory to handle UNC paths
const PROJECT_DIR = path.resolve(__dirname);
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.webmanifest': 'application/manifest+json'
};

const server = http.createServer((req, res) => {
  // Parse the URL path
  let filePath = req.url.split('?')[0]; // Remove query string
  
  // Handle root path - serve index.html
  if (filePath === '/' || filePath === '') {
    filePath = '/index.html';
  }
  
  // Remove leading slash and join with project directory
  filePath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
  filePath = path.join(PROJECT_DIR, filePath);
  
  // Normalize the path to prevent directory traversal
  filePath = path.resolve(filePath); // Use resolve to get absolute path
  
  // Ensure we're not serving files outside the project directory
  const projectDir = path.resolve(PROJECT_DIR);
  if (!filePath.startsWith(projectDir)) {
    console.error(`403 Forbidden: ${req.url} -> ${filePath}`);
    console.error(`Project dir: ${projectDir}`);
    res.writeHead(403, { 'Content-Type': 'text/html' });
    res.end('<h1>403 - Forbidden</h1>', 'utf-8');
    return;
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  console.log(`Serving: ${req.url} -> ${filePath}`);
  
  fs.readFile(filePath, (error, content) => {
    if (error) {
      console.error(`Error serving ${filePath}:`, error.message);
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`<h1>404 - File Not Found</h1><p>Requested: ${req.url}</p><p>Path: ${filePath}</p>`, 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code} - ${error.message}`, 'utf-8');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Serving files from: ${PROJECT_DIR}`);
  console.log(`__dirname: ${__dirname}`);
  
  // Test if we can read index.html
  const testPath = path.join(PROJECT_DIR, 'index.html');
  console.log(`Testing access to: ${testPath}`);
  
  fs.access(testPath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(`ERROR: Cannot access index.html at ${testPath}`);
      console.error(`Error: ${err.message}`);
      console.error(`Error code: ${err.code}`);
      
      // Try to list files in the directory
      fs.readdir(PROJECT_DIR, (readErr, files) => {
        if (readErr) {
          console.error(`Cannot read directory: ${readErr.message}`);
        } else {
          console.log(`Files in directory: ${files.join(', ')}`);
        }
      });
    } else {
      console.log(`✓ Verified: index.html exists at ${testPath}`);
    }
  });
});

