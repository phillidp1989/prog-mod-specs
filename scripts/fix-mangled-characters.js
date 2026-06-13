#!/usr/bin/env node

/**
 * One-off cleanup for mangled-character corruption in the committed spec data.
 *
 * The externally-generated data files contain "?" where en/em dashes, smart
 * quotes and apostrophes should be (e.g. "legacies of the past ? across").
 * This script reuses the SAME normalisation logic as the runtime API layer
 * (utils/encodingNormalizer.js) so the on-disk data matches what the API serves.
 *
 * NOTE: re-run this after every external data drop ("updateFiles" commits),
 * since fresh exports reintroduce the corruption. The runtime normalizer in
 * utils/encodingNormalizer.js covers API responses regardless.
 *
 * Usage:
 *   node scripts/fix-mangled-characters.js            # dry run: report only, no writes
 *   node scripts/fix-mangled-characters.js --fix      # apply fixes + regenerate .gz
 *   node scripts/fix-mangled-characters.js --fix --no-gzip   # skip gz regeneration
 *   node scripts/fix-mangled-characters.js --samples 20      # samples per file (default 10)
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  normalizeString,
  fixQuestionMarkPatterns,
} = require('../utils/encodingNormalizer');

// ---- CLI ----
const args = process.argv.slice(2);
const APPLY = args.includes('--fix');
const NO_GZIP = args.includes('--no-gzip');
const samplesIdx = args.indexOf('--samples');
const MAX_SAMPLES =
  samplesIdx !== -1 && args[samplesIdx + 1] ? parseInt(args[samplesIdx + 1], 10) : 10;

const CONTROLLERS = path.join(__dirname, '..', 'controllers');
const YEARS = [2024, 2025, 2026, 2027];
const JSON_FILES = [];
for (const prefix of ['prog', 'progterm', 'module']) {
  for (const y of YEARS) JSON_FILES.push(`${prefix}${y}.json`);
}
const CSV_FILES = ['progspec2021.csv', 'module-autocomplete.csv'];

// ---- helpers ----
function sample(before, after) {
  // Capture ~80 chars of context around the first divergence.
  let i = 0;
  while (i < before.length && i < after.length && before[i] === after[i]) i++;
  const start = Math.max(0, i - 30);
  return {
    before: before.slice(start, start + 80).replace(/\n/g, '\\n'),
    after: after.slice(start, start + 80).replace(/\n/g, '\\n'),
  };
}

function num(n) {
  return n.toLocaleString('en-US');
}

// Recursively walk a parsed JSON value, normalising string leaves and counting changes.
function walkJson(value, stats, fieldKey) {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    const fixed = normalizeString(value);
    if (fixed !== value) {
      stats.changed++;
      if (fieldKey) stats.fields[fieldKey] = (stats.fields[fieldKey] || 0) + 1;
      if (/ \? /.test(value)) stats.byPattern.spaceDash++;
      else stats.byPattern.other++;
      if (stats.samples.length < MAX_SAMPLES) {
        const s = sample(value, fixed);
        const flag = /https?:|:\/\//.test(value) ? ' [REVIEW]' : '';
        stats.samples.push({ field: fieldKey || '(root)', ...s, flag });
      }
    }
    return fixed;
  }

  if (Array.isArray(value)) {
    return value.map((item) => walkJson(item, stats, fieldKey));
  }

  if (typeof value === 'object') {
    if (value instanceof Date || value instanceof RegExp) return value;
    const out = {};
    for (const key of Object.keys(value)) {
      out[key] = walkJson(value[key], stats, key);
    }
    return out;
  }

  return value;
}

function processJsonFile(fileName) {
  const filePath = path.join(CONTROLLERS, fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`⊘ ${fileName} (not found)`);
    return null;
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  const stats = {
    changed: 0,
    fields: {},
    byPattern: { spaceDash: 0, other: 0 },
    samples: [],
  };
  const fixed = walkJson(data, stats, null);

  reportFile(fileName, stats);

  if (stats.changed > 0 && APPLY) {
    // Match the existing minified serialization style.
    fs.writeFileSync(filePath, JSON.stringify(fixed), 'utf8');
  }
  return { fileName: stats.changed > 0 ? fileName : null, changed: stats.changed };
}

function processCsvFile(fileName) {
  const filePath = path.join(CONTROLLERS, fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`⊘ ${fileName} (not found)`);
    return;
  }
  // Treat as raw text and fix line by line — round-tripping through a CSV
  // parser would change quoting/column order. The ?-patterns only touch
  // characters adjacent to spaces/word chars, leaving CSV structure intact.
  const raw = fs.readFileSync(filePath, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split(/\r?\n/);
  const stats = {
    changed: 0,
    fields: {},
    byPattern: { spaceDash: 0, other: 0 },
    samples: [],
  };
  const fixedLines = lines.map((line) => {
    const fixed = fixQuestionMarkPatterns(line);
    if (fixed !== line) {
      stats.changed++;
      if (/ \? /.test(line)) stats.byPattern.spaceDash++;
      else stats.byPattern.other++;
      if (stats.samples.length < MAX_SAMPLES) {
        const s = sample(line, fixed);
        const flag = /https?:|:\/\//.test(line) ? ' [REVIEW]' : '';
        stats.samples.push({ field: 'line', ...s, flag });
      }
    }
    return fixed;
  });

  reportFile(fileName, stats, 'lines');

  if (stats.changed > 0 && APPLY) {
    fs.writeFileSync(filePath, fixedLines.join(eol), 'utf8');
  }
  return stats.changed;
}

function reportFile(fileName, stats, unit = 'strings') {
  if (stats.changed === 0) {
    console.log(`  ${fileName}: clean`);
    return;
  }
  console.log(`\n  ${fileName}`);
  console.log(
    `    ${unit} changed: ${num(stats.changed)}   ` +
      `(" ? "->" - ": ${num(stats.byPattern.spaceDash)} | other: ${num(stats.byPattern.other)})`
  );
  const topFields = Object.entries(stats.fields)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  if (topFields.length) {
    console.log(
      '    top fields: ' + topFields.map(([k, v]) => `${k} (${num(v)})`).join(', ')
    );
  }
  for (const s of stats.samples) {
    console.log(`      [${s.field}]${s.flag} "${s.before}"`);
    console.log(`        -> "${s.after}"`);
  }
}

// ---- main ----
console.log(`=== fix-mangled-characters (${APPLY ? 'APPLY' : 'DRY RUN'}) ===`);
console.log(`samples per file: ${MAX_SAMPLES}\n`);

console.log('JSON files:');
const changedJson = [];
let totalChanged = 0;
for (const f of JSON_FILES) {
  const result = processJsonFile(f);
  if (result.fileName) changedJson.push(result.fileName);
  totalChanged += result.changed;
  // Encourage GC between large files if exposed (run node with --expose-gc).
  if (global.gc) global.gc();
}

console.log('\nCSV files:');
for (const f of CSV_FILES) {
  totalChanged += processCsvFile(f) || 0;
}

console.log('\n───────────────────────────────────────');
if (APPLY) {
  if (changedJson.length && !NO_GZIP) {
    console.log(`Regenerating .gz for ${changedJson.length} changed JSON file(s)...`);
    try {
      execFileSync(
        process.execPath,
        [path.join(__dirname, 'compress-json-files.js'), ...changedJson],
        { stdio: 'inherit' }
      );
    } catch (err) {
      console.error('✗ gzip regeneration failed:', err.message);
      process.exit(1);
    }
  } else if (changedJson.length && NO_GZIP) {
    console.log('⚠ --no-gzip set: .gz files are now STALE. Run "npm run compress" before deploying.');
  }
  console.log('✓ Fixes applied.');
} else {
  console.log('Dry run — no files written. Re-run with --fix to apply.');
}
console.log(`Total strings/lines changed: ${num(totalChanged)} (see per-file counts above).`);
