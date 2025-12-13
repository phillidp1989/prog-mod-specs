/**
 * Deep Search Controller
 * Handles search API endpoints for full-text search across programmes and modules
 */

const searchIndexManager = require('../services/searchIndex');

/**
 * Deep search across all programmes and modules
 * GET /search/all?q=query&year=2026&limit=20&offset=0
 */
const deepSearchAll = async (req, res) => {
  try {
    const { q, year = '2026', limit = '20', offset = '0' } = req.query;

    // Validate query parameter
    if (!q || q.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 3 characters'
      });
    }

    // Validate year
    const validYears = ['2024', '2025', '2026'];
    if (!validYears.includes(year)) {
      return res.status(400).json({
        success: false,
        error: `Invalid year. Must be one of: ${validYears.join(', ')}`
      });
    }

    // Parse and validate limit/offset
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

    // Perform search
    const results = await searchIndexManager.searchAll(q.trim(), {
      year,
      limit: parsedLimit,
      offset: parsedOffset
    });

    res.json({
      success: true,
      query: q.trim(),
      year,
      limit: parsedLimit,
      offset: parsedOffset,
      total: results.total,
      results: results.results
    });

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
 * GET /search/modules?q=query&year=2026&limit=20&offset=0
 */
const deepSearchModules = async (req, res) => {
  try {
    const { q, year = '2026', limit = '20', offset = '0' } = req.query;

    // Validate query parameter
    if (!q || q.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 3 characters'
      });
    }

    // Validate year
    const validYears = ['2024', '2025', '2026'];
    if (!validYears.includes(year)) {
      return res.status(400).json({
        success: false,
        error: `Invalid year. Must be one of: ${validYears.join(', ')}`
      });
    }

    // Parse and validate limit/offset
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

    // Perform search
    const results = await searchIndexManager.searchModules(q.trim(), {
      year,
      limit: parsedLimit,
      offset: parsedOffset
    });

    res.json({
      success: true,
      query: q.trim(),
      year,
      limit: parsedLimit,
      offset: parsedOffset,
      total: results.total,
      results: results.results
    });

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
 * GET /search/programmes?q=query&year=2026&limit=20&offset=0
 */
const deepSearchProgrammes = async (req, res) => {
  try {
    const { q, year = '2026', limit = '20', offset = '0' } = req.query;

    // Validate query parameter
    if (!q || q.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 3 characters'
      });
    }

    // Validate year
    const validYears = ['2024', '2025', '2026'];
    if (!validYears.includes(year)) {
      return res.status(400).json({
        success: false,
        error: `Invalid year. Must be one of: ${validYears.join(', ')}`
      });
    }

    // Parse and validate limit/offset
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

    // Perform search
    const results = await searchIndexManager.searchProgrammes(q.trim(), {
      year,
      limit: parsedLimit,
      offset: parsedOffset
    });

    res.json({
      success: true,
      query: q.trim(),
      year,
      limit: parsedLimit,
      offset: parsedOffset,
      total: results.total,
      results: results.results
    });

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
