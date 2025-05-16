#!/usr/bin/env node

/**
 * Create a ZIP file for distribution
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Make sure archiver is installed
try {
    require.resolve('archiver');
} catch (e) {
    console.error('Archiver package is required. Please install it with: npm install archiver');
    process.exit(1);
}

// Files to include in the ZIP
const filesToInclude = [
    'index.js',
    'package.json',
    'README.md',
    '.env.example'
];

// Create output directory
const outputDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Create a file to stream archive data to
const output = fs.createWriteStream(path.join(outputDir, 'server-monitor.zip'));
const archive = archiver('zip', {
    zlib: { level: 9 } // Set compression level
});

// Listen for all archive data to be written
output.on('close', function() {
    console.log(`Archive created: ${archive.pointer()} total bytes`);
    console.log('ZIP file has been created at public/server-monitor.zip');
});

// Listen for warnings
archive.on('warning', function(err) {
    if (err.code === 'ENOENT') {
        console.warn(err);
    } else {
        throw err;
    }
});

// Listen for errors
archive.on('error', function(err) {
    throw err;
});

// Pipe archive data to the file
archive.pipe(output);

// Add files
filesToInclude.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        console.log(`Adding ${file} to archive...`);
        archive.file(filePath, { name: file });
    } else {
        console.warn(`Warning: ${file} does not exist, skipping...`);
    }
});

// Finalize the archive
archive.finalize();