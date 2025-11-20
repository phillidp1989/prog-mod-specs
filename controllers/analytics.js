require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dataCache = require('../utils/cache');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Load school-to-college mapping (2KB file vs 430MB of programme data)
let schoolToCollegeMapping = null;
function getSchoolToCollegeMapping() {
  if (!schoolToCollegeMapping) {
    const mappingPath = path.join(__dirname, 'school-college-mapping.json');
    const fs = require('fs');
    const mappingData = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
    schoolToCollegeMapping = mappingData.mapping;
    console.log(`[Analytics] Loaded school-to-college mapping: ${Object.keys(schoolToCollegeMapping).length} schools`);
  }
  return schoolToCollegeMapping;
}

/**
 * Get overall usage statistics
 * Returns: total all-time, last 30 days, last 7 days, programme vs module breakdown
 */
const getUsageStats = async (req, res, next) => {
  try {
    // Get total all-time count
    const { count: totalCount, error: totalError } = await supabase
      .from('specs')
      .select('*', { count: 'exact', head: true });

    if (totalError) throw totalError;

    // Get count for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: last30Count, error: last30Error } = await supabase
      .from('specs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (last30Error) throw last30Error;

    // Get count for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: last7Count, error: last7Error } = await supabase
      .from('specs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

    if (last7Error) throw last7Error;

    // Get programme vs module breakdown
    const { data: typeData, error: typeError } = await supabase
      .from('specs')
      .select('prog_or_mod')
      .range(0, 99999);

    if (typeError) throw typeError;

    const progCount = typeData.filter(item => item.prog_or_mod === 'prog').length;
    const modCount = typeData.filter(item => item.prog_or_mod === 'mod').length;

    res.status(200).json({
      totalAllTime: totalCount || 0,
      last30Days: last30Count || 0,
      last7Days: last7Count || 0,
      byType: {
        programmes: progCount,
        modules: modCount
      }
    });
  } catch (error) {
    console.error('Error getting usage stats:', error);
    res.status(500).json({ error: 'Failed to get usage statistics' });
  }
};

/**
 * Get usage by month with optional filters
 * Query params: startDate, endDate, type (prog/mod), college, school, department
 * Uses server-side RPC function for efficient aggregation
 */
const getUsageByMonth = async (req, res, next) => {
  try {
    const { startDate, endDate, type, college, school, department } = req.query;

    // Call the RPC function with parameters
    const { data, error } = await supabase.rpc('get_usage_by_month', {
      start_date: startDate || null,
      end_date: endDate || null,
      filter_type: type || null,
      filter_college: college || null,
      filter_school: school || null,
      filter_department: department || null
    });

    if (error) throw error;

    // Data is already aggregated by the database
    res.status(200).json(data);
  } catch (error) {
    console.error('Error getting usage by month:', error);
    res.status(500).json({ error: 'Failed to get monthly usage data' });
  }
};

/**
 * Get usage by college with optional time period filter
 * Query params: startDate, endDate, type (prog/mod)
 * Applies school-to-college mapping for records with missing college codes
 */
const getUsageByCollege = async (req, res, next) => {
  try {
    const { startDate, endDate, type } = req.query;

    // Fetch ALL records using pagination
    // Supabase has a hard limit of 1000 rows per request, so we need to paginate
    let allRecords = [];
    let start = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      // Build query for this page
      let query = supabase
        .from('specs')
        .select('college, school, created_at, prog_or_mod')
        .range(start, start + pageSize - 1);

      // Apply filters
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }
      if (type) {
        query = query.eq('prog_or_mod', type);
      }

      const { data: pageRecords, error } = await query;

      if (error) throw error;

      if (pageRecords && pageRecords.length > 0) {
        allRecords = allRecords.concat(pageRecords);
        start += pageSize;

        // If we got less than pageSize, we've reached the end
        if (pageRecords.length < pageSize) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    const records = allRecords;

    // Get school-to-college mapping (2KB file vs 430MB of programme data)
    const schoolToCollegeMap = getSchoolToCollegeMapping();

    // Aggregate counts by college, applying mapping for missing colleges
    const collegeCounts = {};
    let mappedCount = 0;
    let unmappedCount = 0;

    records.forEach(record => {
      let college = record.college;

      // If college is missing, try to look it up from school
      if (!college && record.school) {
        college = schoolToCollegeMap[record.school];
        if (college) {
          mappedCount++;
        } else {
          unmappedCount++;
        }
      }

      // Only count if we have a college
      if (college) {
        collegeCounts[college] = (collegeCounts[college] || 0) + 1;
      }
    });

    console.log(`College usage: ${records.length} total records, ${mappedCount} mapped from school, ${unmappedCount} unmapped`);

    // Sort by count descending
    const sortedColleges = Object.entries(collegeCounts)
      .sort((a, b) => b[1] - a[1])
      .reduce((acc, [college, count]) => {
        acc[college] = count;
        return acc;
      }, {});

    res.status(200).json(sortedColleges);
  } catch (error) {
    console.error('Error getting usage by college:', error);
    res.status(500).json({ error: 'Failed to get college usage data' });
  }
};

/**
 * Get usage by school with optional filters
 * Query params: startDate, endDate, type (prog/mod), college, limit
 * Uses server-side RPC function for efficient aggregation
 */
const getUsageBySchool = async (req, res, next) => {
  try {
    const { startDate, endDate, type, college, limit = 10 } = req.query;

    // Call the RPC function with parameters
    const { data, error } = await supabase.rpc('get_usage_by_school', {
      start_date: startDate || null,
      end_date: endDate || null,
      filter_type: type || null,
      filter_college: college || null,
      result_limit: parseInt(limit)
    });

    if (error) throw error;

    // Convert array to object format for backward compatibility
    const sortedSchools = data.reduce((acc, item) => {
      acc[item.school] = parseInt(item.count);
      return acc;
    }, {});

    res.status(200).json(sortedSchools);
  } catch (error) {
    console.error('Error getting usage by school:', error);
    res.status(500).json({ error: 'Failed to get school usage data' });
  }
};

/**
 * Get top most frequently generated programme/module codes
 * Query params: startDate, endDate, type (prog/mod), limit
 * Uses server-side RPC function for efficient aggregation
 */
const getTopSpecs = async (req, res, next) => {
  try {
    const { startDate, endDate, type, limit = 20 } = req.query;

    // Call the RPC function with parameters
    const { data, error } = await supabase.rpc('get_top_specs', {
      start_date: startDate || null,
      end_date: endDate || null,
      filter_type: type || null,
      result_limit: parseInt(limit)
    });

    if (error) throw error;

    // Convert bigint counts to regular numbers
    const topCodes = data.map(item => ({
      code: item.code,
      title: item.title,
      type: item.type,
      count: parseInt(item.count)
    }));

    res.status(200).json(topCodes);
  } catch (error) {
    console.error('Error getting top specs:', error);
    res.status(500).json({ error: 'Failed to get top specs data' });
  }
};

module.exports = {
  getUsageStats,
  getUsageByMonth,
  getUsageByCollege,
  getUsageBySchool,
  getTopSpecs
};
