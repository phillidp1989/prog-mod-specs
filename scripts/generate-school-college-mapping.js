#!/usr/bin/env node

/**
 * Generate school-to-college mapping file from programme data
 * This eliminates the need to load 430+ MB of programme data just to map schools to colleges
 *
 * Usage: node scripts/generate-school-college-mapping.js
 */

const fs = require('fs');
const path = require('path');

// Programme file paths
const programmeFiles = [
    '../controllers/prog2024.json',
    '../controllers/prog2025.json',
    '../controllers/prog2026.json',
    '../controllers/progterm2024.json',
    '../controllers/progterm2025.json',
    '../controllers/progterm2026.json'
];

// Output file path
const outputPath = path.join(__dirname, '../controllers/school-college-mapping.json');

console.log('Generating school-to-college mapping...\n');

// Map to store unique school -> college mappings
const schoolToCollegeMap = {};
let totalProgrammes = 0;
let filesProcessed = 0;

// Process each programme file
programmeFiles.forEach(relativeFile => {
    const filePath = path.join(__dirname, relativeFile);

    try {
        console.log(`Reading ${path.basename(filePath)}...`);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (!data.data || !Array.isArray(data.data)) {
            console.warn(`  ⚠️  Warning: ${path.basename(filePath)} has unexpected structure`);
            return;
        }

        // Extract school -> college mappings
        data.data.forEach(prog => {
            if (prog.school && prog.college) {
                // Only add if not already mapped, or if mapping is consistent
                if (!schoolToCollegeMap[prog.school]) {
                    schoolToCollegeMap[prog.school] = prog.college;
                } else if (schoolToCollegeMap[prog.school] !== prog.college) {
                    // Conflict detected - same school maps to different colleges
                    console.warn(`  ⚠️  Conflict: ${prog.school} maps to both "${schoolToCollegeMap[prog.school]}" and "${prog.college}"`);
                }
            }
            totalProgrammes++;
        });

        console.log(`  ✓ Processed ${data.data.length.toLocaleString()} programmes`);
        filesProcessed++;

    } catch (error) {
        console.error(`  ✗ Error reading ${path.basename(filePath)}:`, error.message);
    }
});

// Write mapping to file
console.log(`\nGenerating mapping file...`);
const mappingData = {
    generated: new Date().toISOString(),
    description: 'School to College mapping extracted from programme data',
    totalSchools: Object.keys(schoolToCollegeMap).length,
    totalProgrammesProcessed: totalProgrammes,
    filesProcessed: filesProcessed,
    mapping: schoolToCollegeMap
};

try {
    fs.writeFileSync(outputPath, JSON.stringify(mappingData, null, 2), 'utf8');
    const stats = fs.statSync(outputPath);

    console.log('\n✓ Mapping file generated successfully!');
    console.log(`  Location: ${outputPath}`);
    console.log(`  Schools mapped: ${Object.keys(schoolToCollegeMap).length}`);
    console.log(`  File size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`  Reduction: ${(430 * 1024 / stats.size).toFixed(0)}x smaller than loading all programme files\n`);

    // Show sample mappings
    console.log('Sample mappings:');
    Object.entries(schoolToCollegeMap).slice(0, 5).forEach(([school, college]) => {
        console.log(`  "${school}" → "${college}"`);
    });

} catch (error) {
    console.error('\n✗ Error writing mapping file:', error.message);
    process.exit(1);
}
