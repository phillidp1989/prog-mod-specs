/**
 * Query Parser for Deep Search
 * Parses advanced query syntax into structured format for FlexSearch
 *
 * Supported syntax:
 * - Exact phrase: "machine learning"
 * - AND operator: climate AND sustainability
 * - OR operator: python OR javascript
 * - Exclude terms: programming -java
 * - Combined: "data science" AND python -java
 */

/**
 * Parse a search query string into structured components
 * @param {string} queryString - The raw query string from user input
 * @returns {Object} Parsed query object with terms, phrases, excluded, and operator
 */
function parseQuery(queryString) {
  if (!queryString || typeof queryString !== 'string') {
    return {
      terms: [],
      phrases: [],
      excluded: [],
      operator: 'OR',
      originalQuery: '',
      searchTerms: [] // Combined terms for FlexSearch
    };
  }

  const result = {
    terms: [],         // Regular search terms
    phrases: [],       // Exact phrases (quoted)
    excluded: [],      // Terms to exclude (prefixed with -)
    operator: 'OR',    // Default operator between terms
    originalQuery: queryString.trim(),
    searchTerms: []    // All positive terms combined for FlexSearch
  };

  let remaining = queryString.trim();

  // Step 1: Extract exact phrases (quoted strings)
  const phraseRegex = /"([^"]+)"/g;
  let match;
  while ((match = phraseRegex.exec(remaining)) !== null) {
    const phrase = match[1].trim();
    if (phrase.length > 0) {
      result.phrases.push(phrase);
    }
  }
  // Remove phrases from remaining string
  remaining = remaining.replace(phraseRegex, ' ');

  // Step 2: Detect AND/OR operators
  // Check for explicit AND (case insensitive)
  if (/\bAND\b/i.test(remaining)) {
    result.operator = 'AND';
  } else if (/\bOR\b/i.test(remaining)) {
    result.operator = 'OR';
  }

  // Remove operator keywords
  remaining = remaining.replace(/\bAND\b/gi, ' ').replace(/\bOR\b/gi, ' ');

  // Step 3: Extract excluded terms (prefixed with -)
  const excludeRegex = /-(\S+)/g;
  while ((match = excludeRegex.exec(remaining)) !== null) {
    const excluded = match[1].trim();
    if (excluded.length > 0) {
      result.excluded.push(excluded.toLowerCase());
    }
  }
  // Remove excluded terms from remaining string
  remaining = remaining.replace(excludeRegex, ' ');

  // Step 4: Split remaining into individual terms
  const terms = remaining.split(/\s+/).filter(term => term.length > 0);
  result.terms = terms;

  // Step 5: Build searchTerms array (all positive terms for FlexSearch)
  result.searchTerms = [...result.terms, ...result.phrases];

  return result;
}

/**
 * Check if a result matches the parsed query criteria
 * @param {Object} result - Search result object with matches
 * @param {Object} parsedQuery - Parsed query from parseQuery()
 * @param {string} fullContent - Combined text content of the result for phrase matching
 * @returns {boolean} True if result matches all criteria
 */
function matchesQueryCriteria(result, parsedQuery, fullContent) {
  const contentLower = fullContent.toLowerCase();

  // Check excluded terms - reject if any excluded term is found
  for (const excluded of parsedQuery.excluded) {
    if (contentLower.includes(excluded)) {
      return false;
    }
  }

  // Check exact phrases - all phrases must be present
  for (const phrase of parsedQuery.phrases) {
    if (!contentLower.includes(phrase.toLowerCase())) {
      return false;
    }
  }

  // For AND operator, check that all terms are present
  if (parsedQuery.operator === 'AND' && parsedQuery.terms.length > 1) {
    for (const term of parsedQuery.terms) {
      if (!contentLower.includes(term.toLowerCase())) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Get the FlexSearch query string from parsed query
 * For OR queries, use all terms together
 * For AND queries, also use all terms (post-filter handles AND logic)
 * @param {Object} parsedQuery - Parsed query from parseQuery()
 * @returns {string} Query string for FlexSearch
 */
function getFlexSearchQuery(parsedQuery) {
  // Combine all positive terms for broad search
  // Post-filtering will handle AND logic and exclusions
  return parsedQuery.searchTerms.join(' ');
}

/**
 * Get full text content from a module result for matching
 * @param {Object} module - Module data object
 * @returns {string} Combined searchable text
 */
function getModuleContent(module) {
  const parts = [
    module.code || '',
    module.title || '',
    module.school || '',
    module.dept || '',
    module.lead || '',
    module.campus || ''
  ];

  // Add array fields
  if (Array.isArray(module.description)) {
    parts.push(module.description.join(' '));
  }
  if (Array.isArray(module.outcomes)) {
    parts.push(module.outcomes.join(' '));
  }
  if (Array.isArray(module.summative)) {
    parts.push(module.summative.join(' '));
  }
  if (Array.isArray(module.formative)) {
    parts.push(module.formative.join(' '));
  }

  return parts.join(' ');
}

/**
 * Get full text content from a programme result for matching
 * @param {Object} programme - Programme data object
 * @returns {string} Combined searchable text
 */
function getProgrammeContent(programme) {
  const parts = [
    programme.progCode || '',
    programme.progTitle || '',
    programme.shortTitle || '',
    programme.longTitle || '',
    programme.longQual || '',
    programme.college || '',
    programme.school || '',
    programme.campus || ''
  ];

  // Add array fields
  if (Array.isArray(programme.aims)) {
    parts.push(programme.aims.join(' '));
  }
  if (programme.knowledge && Array.isArray(programme.knowledge.outcome)) {
    parts.push(programme.knowledge.outcome.join(' '));
  }
  if (programme.skills && Array.isArray(programme.skills.outcome)) {
    parts.push(programme.skills.outcome.join(' '));
  }

  return parts.join(' ');
}

module.exports = {
  parseQuery,
  matchesQueryCriteria,
  getFlexSearchQuery,
  getModuleContent,
  getProgrammeContent
};
