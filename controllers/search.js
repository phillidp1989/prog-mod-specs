/**
 * Deep Search Controller
 * Handles search API endpoints for full-text search across programmes and modules
 * Supports advanced query syntax and result filtering
 */

const searchIndexManager = require('../services/searchIndex');
const { normalizeResponse } = require('../utils/encodingNormalizer');

/**
 * Parse filter parameters from query string
 * Filters are comma-separated values: ?colleges=College1,College2&levels=H,M
 */
function parseFilters(query) {
  const filters = {};

  // Type filter (programme, module)
  if (query.types) {
    filters.types = query.types.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
  }

  // College filter
  if (query.colleges) {
    filters.colleges = query.colleges.split(',').map(c => c.trim()).filter(Boolean);
  }

  // School filter
  if (query.schools) {
    filters.schools = query.schools.split(',').map(s => s.trim()).filter(Boolean);
  }

  // Campus filter
  if (query.campuses) {
    filters.campuses = query.campuses.split(',').map(c => c.trim()).filter(Boolean);
  }

  // Level filter (for modules: C, H, M, D, I)
  if (query.levels) {
    filters.levels = query.levels.split(',').map(l => l.trim().toUpperCase()).filter(Boolean);
  }

  // Credits filter (for modules)
  if (query.credits) {
    filters.credits = query.credits.split(',').map(c => c.trim()).filter(Boolean);
  }

  // Mode filter (for programmes: Full-time, Part-time)
  if (query.modes) {
    filters.modes = query.modes.split(',').map(m => m.trim()).filter(Boolean);
  }

  // Match fields filter (which fields the search matched in)
  if (query.matchFields) {
    filters.matchFields = query.matchFields.split(',').map(f => f.trim()).filter(Boolean);
  }

  return filters;
}

/**
 * Deep search across all programmes and modules
 * GET /search/all?q=query&year=2027&limit=20&offset=0
 *
 * Advanced query syntax:
 * - Exact phrase: "machine learning"
 * - AND operator: climate AND sustainability
 * - OR operator: python OR javascript
 * - Exclude terms: programming -java
 *
 * Filter parameters:
 * - types: programme,module
 * - colleges: College of Science and Engineering,College of Arts
 * - schools: School of Informatics,School of Engineering
 * - campuses: Edinburgh,Dubai
 * - levels: H,M,D (for modules)
 * - credits: 10,20,40 (for modules)
 * - modes: Full-time,Part-time (for programmes)
 */
const deepSearchAll = async (req, res) => {
  try {
    const { q, year = '2027', limit = '20', offset = '0' } = req.query;

    // Validate query parameter
    if (!q || q.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 3 characters'
      });
    }

    // Validate year
    const validYears = ['2025', '2026', '2027'];
    if (!validYears.includes(year)) {
      return res.status(400).json({
        success: false,
        error: `Invalid year. Must be one of: ${validYears.join(', ')}`
      });
    }

    // Parse and validate limit/offset
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

    // Parse filter parameters
    const filters = parseFilters(req.query);

    // Perform search with filters
    const results = await searchIndexManager.searchAll(q.trim(), {
      year,
      limit: parsedLimit,
      offset: parsedOffset,
      filters
    });

    res.json(normalizeResponse({
      success: true,
      query: q.trim(),
      year,
      limit: parsedLimit,
      offset: parsedOffset,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      total: results.total,
      results: results.results
    }));

  } catch (error) {
    console.error('Deep search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed. Please try again.'
    });
  }
};

/**
 * Deep search modules only
 * GET /search/modules?q=query&year=2027&limit=20&offset=0
 * Supports same filter parameters as /search/all
 */
const deepSearchModules = async (req, res) => {
  try {
    const { q, year = '2027', limit = '20', offset = '0' } = req.query;

    // Validate query parameter
    if (!q || q.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 3 characters'
      });
    }

    // Validate year
    const validYears = ['2025', '2026', '2027'];
    if (!validYears.includes(year)) {
      return res.status(400).json({
        success: false,
        error: `Invalid year. Must be one of: ${validYears.join(', ')}`
      });
    }

    // Parse and validate limit/offset
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

    // Parse filter parameters
    const filters = parseFilters(req.query);

    // Perform search with filters
    const results = await searchIndexManager.searchModules(q.trim(), {
      year,
      limit: parsedLimit,
      offset: parsedOffset,
      filters
    });

    res.json(normalizeResponse({
      success: true,
      query: q.trim(),
      year,
      limit: parsedLimit,
      offset: parsedOffset,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      total: results.total,
      results: results.results
    }));

  } catch (error) {
    console.error('Module search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed. Please try again.'
    });
  }
};

/**
 * Deep search programmes only
 * GET /search/programmes?q=query&year=2027&limit=20&offset=0
 * Supports same filter parameters as /search/all
 */
const deepSearchProgrammes = async (req, res) => {
  try {
    const { q, year = '2027', limit = '20', offset = '0' } = req.query;

    // Validate query parameter
    if (!q || q.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 3 characters'
      });
    }

    // Validate year
    const validYears = ['2025', '2026', '2027'];
    if (!validYears.includes(year)) {
      return res.status(400).json({
        success: false,
        error: `Invalid year. Must be one of: ${validYears.join(', ')}`
      });
    }

    // Parse and validate limit/offset
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

    // Parse filter parameters
    const filters = parseFilters(req.query);

    // Perform search with filters
    const results = await searchIndexManager.searchProgrammes(q.trim(), {
      year,
      limit: parsedLimit,
      offset: parsedOffset,
      filters
    });

    res.json(normalizeResponse({
      success: true,
      query: q.trim(),
      year,
      limit: parsedLimit,
      offset: parsedOffset,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      total: results.total,
      results: results.results
    }));

  } catch (error) {
    console.error('Programme search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed. Please try again.'
    });
  }
};

module.exports = {
  deepSearchAll,
  deepSearchModules,
  deepSearchProgrammes
};
