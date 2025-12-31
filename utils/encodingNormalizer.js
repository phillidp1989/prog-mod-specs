/**
 * Character Encoding Normalization Utility
 *
 * Normalizes Unicode smart punctuation and fixes malformed question mark patterns
 * in API responses before sending to frontend.
 *
 * This addresses character encoding issues where question marks appear in place of:
 * - Dashes/hyphens (used as list item indicators)
 * - Apostrophes (in contractions and possessives)
 */

/**
 * Character replacement mappings for smart punctuation
 */
const PUNCTUATION_REPLACEMENTS = {
  // Curly/smart double quotes -> straight double quote
  '\u201C': '"',  // Left double quotation mark "
  '\u201D': '"',  // Right double quotation mark "
  '\u201E': '"',  // Double low-9 quotation mark
  '\u201F': '"',  // Double high-reversed-9 quotation mark
  '\u00AB': '"',  // Left-pointing double angle quotation
  '\u00BB': '"',  // Right-pointing double angle quotation

  // Curly/smart single quotes -> straight apostrophe
  '\u2018': "'",  // Left single quotation mark '
  '\u2019': "'",  // Right single quotation mark '
  '\u201A': "'",  // Single low-9 quotation mark
  '\u201B': "'",  // Single high-reversed-9 quotation mark
  '\u2039': "'",  // Single left-pointing angle quotation
  '\u203A': "'",  // Single right-pointing angle quotation
  '\u0060': "'",  // Grave accent
  '\u00B4': "'",  // Acute accent

  // Dashes -> hyphen-minus
  '\u2013': '-',  // En dash
  '\u2014': '-',  // Em dash
  '\u2015': '-',  // Horizontal bar
  '\u2012': '-',  // Figure dash
  '\u2010': '-',  // Hyphen
  '\u2011': '-',  // Non-breaking hyphen

  // Ellipsis -> three dots
  '\u2026': '...',  // Horizontal ellipsis

  // Other common Unicode punctuation
  '\u2022': '-',   // Bullet point -> hyphen (for list items)
  '\u2023': '-',   // Triangular bullet
  '\u2043': '-',   // Hyphen bullet
  '\u00A0': ' ',   // Non-breaking space -> regular space
  '\u00AD': '',    // Soft hyphen (remove)
  '\u200B': '',    // Zero-width space (remove)
  '\u200C': '',    // Zero-width non-joiner (remove)
  '\u200D': '',    // Zero-width joiner (remove)
  '\uFEFF': '',    // Byte order mark (remove)
};

/**
 * Build regex pattern from replacement keys for efficient single-pass replacement
 */
const PUNCTUATION_REGEX = new RegExp(
  Object.keys(PUNCTUATION_REPLACEMENTS)
    .map(char => char.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
    .join('|'),
  'g'
);

/**
 * Normalize smart punctuation in a string
 * @param {string} str - Input string
 * @returns {string} - Normalized string
 */
function normalizePunctuation(str) {
  if (typeof str !== 'string' || str.length === 0) {
    return str;
  }

  return str.replace(PUNCTUATION_REGEX, match => PUNCTUATION_REPLACEMENTS[match]);
}

/**
 * Fix malformed question mark patterns that should be apostrophes or list markers
 *
 * Patterns handled:
 * 1. ? at start of line/after newline -> - (list item indicator)
 * 2. ?s, ?t, ?ll, ?ve, ?re, ?d patterns -> apostrophe contractions
 * 3. ? surrounded by letters -> ' (mid-word apostrophe)
 *
 * @param {string} str - Input string
 * @returns {string} - Fixed string
 */
function fixQuestionMarkPatterns(str) {
  if (typeof str !== 'string' || str.length === 0) {
    return str;
  }

  let result = str;

  // Pattern 1: ? at start of line or after newline -> list item marker
  result = result.replace(/^(\?)\s/gm, '- ');
  result = result.replace(/\n(\?)\s/g, '\n- ');

  // Pattern 2: Common contractions with ?
  // ?s -> 's (e.g., student?s -> student's, it?s -> it's)
  result = result.replace(/(\w)\?s\b/gi, "$1's");
  // ?t -> 't (e.g., don?t -> don't, can?t -> can't)
  result = result.replace(/(\w)\?t\b/gi, "$1't");
  // ?ll -> 'll (e.g., we?ll -> we'll)
  result = result.replace(/(\w)\?ll\b/gi, "$1'll");
  // ?ve -> 've (e.g., we?ve -> we've)
  result = result.replace(/(\w)\?ve\b/gi, "$1've");
  // ?re -> 're (e.g., we?re -> we're)
  result = result.replace(/(\w)\?re\b/gi, "$1're");
  // ?d -> 'd (e.g., we?d -> we'd)
  result = result.replace(/(\w)\?d\b/gi, "$1'd");

  // Pattern 3: ? between letters (mid-word apostrophe)
  // e.g., o?clock -> o'clock
  result = result.replace(/(\w)\?(\w)/g, "$1'$2");

  return result;
}

/**
 * Apply all normalization to a string
 * @param {string} str - Input string
 * @returns {string} - Fully normalized string
 */
function normalizeString(str) {
  if (typeof str !== 'string') {
    return str;
  }

  let result = normalizePunctuation(str);
  result = fixQuestionMarkPatterns(result);

  return result;
}

/**
 * Recursively normalize all string values in an object or array
 * Handles deeply nested structures efficiently
 *
 * @param {any} data - Input data (object, array, or primitive)
 * @param {number} [depth=0] - Current recursion depth (for safety)
 * @param {number} [maxDepth=50] - Maximum recursion depth
 * @returns {any} - Normalized data
 */
function normalizeDeep(data, depth = 0, maxDepth = 50) {
  // Safety check for maximum depth
  if (depth > maxDepth) {
    console.warn('normalizeDeep: Maximum recursion depth exceeded');
    return data;
  }

  // Handle null/undefined
  if (data === null || data === undefined) {
    return data;
  }

  // Handle strings - the main normalization target
  if (typeof data === 'string') {
    return normalizeString(data);
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => normalizeDeep(item, depth + 1, maxDepth));
  }

  // Handle objects (but not special types like Date, RegExp, etc.)
  if (typeof data === 'object') {
    // Skip special object types
    if (data instanceof Date || data instanceof RegExp) {
      return data;
    }

    const normalized = {};
    for (const key of Object.keys(data)) {
      normalized[key] = normalizeDeep(data[key], depth + 1, maxDepth);
    }
    return normalized;
  }

  // Return primitives (numbers, booleans) unchanged
  return data;
}

/**
 * Express response wrapper that normalizes JSON before sending
 * Use this in controllers: res.json(normalizeResponse(data))
 *
 * @param {any} data - Response data to normalize
 * @returns {any} - Normalized response data
 */
function normalizeResponse(data) {
  return normalizeDeep(data);
}

module.exports = {
  normalizeResponse,
  normalizeDeep,
  normalizeString,
  normalizePunctuation,
  fixQuestionMarkPatterns,
  // Export for testing
  PUNCTUATION_REPLACEMENTS
};
