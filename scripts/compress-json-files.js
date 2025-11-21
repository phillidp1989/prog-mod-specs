#!/usr/bin/env node

/**
 * Compress large JSON files to gzip format for faster loading
 * This can reduce file sizes by 80-90% and improve disk I/O performance
 *
 * Usage: node scripts/compress-json-files.js
 */

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// Files to compress
const filesToCompress = [
    '../controllers/prog2024.json',
    '../controllers/prog2025.json',
    '../controllers/prog2026.json',
    '../controllers/progterm2024.json',
    '../controllers/progterm2025.json',
    '../controllers/progterm2026.json',
    '../controllers/module2024.json',
    '../controllers/module2025.json',
    '../controllers/module2026.json'
];

console.log('Compressing JSON files to gzip format...\n');

let totalOriginalSize = 0;
let totalCompressedSize = 0;
let filesProcessed = 0;

filesToCompress.forEach(relativeFile => {
    const filePath = path.join(__dirname, relativeFile);
    const outputPath = filePath + '.gz';

    try {
        if (!fs.existsSync(filePath)) {
            console.log(`⊘ Skipping ${path.basename(filePath)} (file not found)`);
            return;
        }

        console.log(`Compressing ${path.basename(filePath)}...`);

        // Read the JSON file
        const originalData = fs.readFileSync(filePath);
        const originalSize = originalData.length;

        // Compress with gzip (level 9 = maximum compression)
        const compressed = zlib.gzipSync(originalData, { level: 9 });
        const compressedSize = compressed.length;

        // Write compressed file
        fs.writeFileSync(outputPath, compressed);

        const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

        console.log(`  ✓ ${path.basename(outputPath)} created`);
        console.log(`    Original: ${formatBytes(originalSize)}`);
        console.log(`    Compressed: ${formatBytes(compressedSize)}`);
        console.log(`    Reduction: ${ratio}%\n`);

        totalOriginalSize += originalSize;
        totalCompressedSize += compressedSize;
        filesProcessed++;

    } catch (error) {
        console.error(`  ✗ Error compressing ${path.basename(filePath)}:`, error.message);
    }
});

// Summary
if (filesProcessed > 0) {
    const totalRatio = ((1 - totalCompressedSize / totalOriginalSize) * 100).toFixed(1);

    console.log('\n═══════════════════════════════════════');
    console.log('✓ Compression Complete!');
    console.log('═══════════════════════════════════════');
    console.log(`Files processed: ${filesProcessed}`);
    console.log(`Total original size: ${formatBytes(totalOriginalSize)}`);
    console.log(`Total compressed size: ${formatBytes(totalCompressedSize)}`);
    console.log(`Total space saved: ${formatBytes(totalOriginalSize - totalCompressedSize)} (${totalRatio}%)`);
    console.log('═══════════════════════════════════════\n');

    console.log('Next steps:');
    console.log('1. Test the application - it will automatically use .gz files');
    console.log('2. If everything works, you can optionally delete the .json files');
    console.log('3. Keep both .json and .json.gz for now (cache will prefer .gz)\n');
} else {
    console.log('\n✗ No files were processed\n');
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
