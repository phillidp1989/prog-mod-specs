require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const path = require("path");
const csv = require("csvtojson");
const dataCache = require('../utils/cache');
const { sendModuleChangeNotification } = require('../services/emailService');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Load school-to-college mapping (2KB file vs 430MB of programme data)
let schoolToCollegeMapping = null;
function getSchoolToCollegeMapping() {
  if (!schoolToCollegeMapping) {
    const mappingPath = path.join(__dirname, 'school-college-mapping.json');
    const mappingData = JSON.parse(require('fs').readFileSync(mappingPath, 'utf8'));
    schoolToCollegeMapping = mappingData.mapping;
    console.log(`Loaded school-to-college mapping: ${Object.keys(schoolToCollegeMapping).length} schools`);
  }
  return schoolToCollegeMapping;
}

/**
 * Get module data for a specific year
 * Uses lazy-loading cache to avoid loading all files on startup
 * @param {string} year - Year (2024, 2025, 2026)
 * @returns {Object} - Module data
 */
function getModuleDataForYear(year) {
  const cacheKey = `module${year}`;
  const filePath = path.join(__dirname, `module${year}.json`);
  return dataCache.get(cacheKey, filePath);
}

// Function to remove level from module
const removeLevel = (module) => {
  let newModule = "";
  if (module) {
    newModule = module.replace(/LC\s|LI\s|LH\s|LM\s|LD\s/g, "");
  }
  return newModule;
};

// Function to generate spec
const moduleData = async (req, res, next) => {
  try {
    selectedModule = req.params.modCode;
    selectedYear = req.params.year;

    // Load data using cache (lazy-loading)
    const moduleDataset = getModuleDataForYear(selectedYear);
    const data = moduleDataset.data;

    if (!data) {
      return res.status(404).json({
        error: `Module data not found for year ${selectedYear}`
      });
    }

    const final = data.filter((mod) => mod.code === selectedModule);

    // Check if module was found
    if (final.length === 0 || !final[0]) {
      return res.status(404).json({
        error: `Module not found: ${selectedModule}`
      });
    }

    console.log(final[0]);
    final[0].matchedBoolean = false;

    // Get school-to-college mapping (2KB file vs 430MB of programme data)
    const schoolToCollegeMap = getSchoolToCollegeMapping();

    if (
      data.some(
        (mod) =>
          removeLevel(mod.title).toLowerCase() === removeLevel(final[0].title).toLowerCase() &&
          mod.dept === final[0].dept &&
          mod.level === final[0].level &&
          mod.credits === final[0].credits &&
          mod.code !== final[0].code          
      )
    ) {
      const matchedModule = JSON.stringify(
        data
          .filter(
            (mod) =>
              removeLevel(mod.title).toLowerCase() === removeLevel(final[0].title).toLowerCase() &&
              mod.dept === final[0].dept &&
              mod.level === final[0].level &&
              mod.credits === final[0].credits &&
              mod.code !== final[0].code    
          )
          .map(
            (mod) =>
              mod.code +
              " - " +
              mod.title +
              " (" +
              mod.campus +
              ")" +
              " (" +
              mod.semester +
              ")"
          )
      );
      final[0].duplicate = JSON.parse(matchedModule);
      final[0].matchedBoolean = true;
    }

    // Determine college value: use module's college if available, otherwise look up from mapping
    let collegeToUse = final[0].college;
    if (!collegeToUse && final[0].school) {
      collegeToUse = schoolToCollegeMap[final[0].school];
      if (collegeToUse) {
        console.log(`College mapped from school for ${final[0].code}: ${final[0].school} -> ${collegeToUse}`);
      } else {
        console.log(`Warning: No college found for module ${final[0].code} (school: ${final[0].school})`);
      }
    }

    // Insert data into Supabase with proper error handling
    async function insertData() {
      const { data, error } = await supabase
        .from('specs')
        .insert([{
          prog_or_mod: 'mod',
          code: final[0].code,
          title: final[0].title,
          college: collegeToUse,
          school: final[0].school,
          department: final[0].dept,
          year: selectedYear,
          created_at: new Date().toISOString(),
        }])
      return data;
    }

    insertData()
      .then((data) => {
        console.log('Supabase insert successful:', data);
      })
      .catch((error) => {
        console.error('Supabase insert failed:', error);
        // Don't fail the request if Supabase insert fails
      });

    res.status(200).json(final[0]);
  } catch (error) {
    console.error('Error in moduleData:', error);
    next(error);
  }
};

// Cache for module autocomplete data (1 hour TTL)
let moduleAutocompleteCache = null;
let moduleAutocompleteCacheTime = 0;
const MODULE_AUTOCOMPLETE_CACHE_TTL = 60 * 60 * 1000; // 1 hour

const moduleAutocompleteData = async (req, res, next) => {
  try {
    // Check if cache is valid
    const now = Date.now();
    if (moduleAutocompleteCache && (now - moduleAutocompleteCacheTime) < MODULE_AUTOCOMPLETE_CACHE_TTL) {
      console.log('Returning cached module autocomplete data');
      return res.status(200).json(moduleAutocompleteCache);
    }

    let moduleInfo;
    const filePathSpec = path.join(__dirname, `module-autocomplete.csv`);
    const specArray = await csv().fromFile(filePathSpec);
    const initialData = {};
    let camp = "";

    specArray.forEach((mod) => {
      if (mod["Section Camp Desc"]) {
        camp = ` (${mod["Section Camp Desc"]})`;
      } else {
        camp = "";
      }

      // Include semester, school, college, and credits for filtering and catalogue cards
      const semester = mod["Web Semester Desc"] || "Not Yet Specified";
      const school = mod["Division Desc"] || "";
      const college = mod["College Desc"] || "";
      const credits = mod["Credit Hours"] || "20"; // Extract credits from CSV
      moduleInfo = `${mod["Course Number"]} - ${mod["Course Long Desc"]}${camp} - ${semester} [${school}] {${college}} |${credits}|`;
      initialData[moduleInfo] = null;
    });

    // Update cache
    moduleAutocompleteCache = initialData;
    moduleAutocompleteCacheTime = Date.now();

    res.status(200).json(initialData);
  } catch (error) {
    console.error('Error in moduleAutocompleteData:', error);
    next(error);
  }
};

// Get module level distribution for charts
const moduleLevelDistribution = async (req, res, next) => {
  try {
    // Use 2026 data as the most recent (loaded via cache)
    const moduleDataset = getModuleDataForYear('2026');
    const data = moduleDataset.data;

    // Count modules by level
    const levelCounts = {};
    data.forEach(mod => {
      if (mod.level) {
        const level = mod.level.replace('L', ''); // Remove 'L' prefix: LC -> C, LI -> I
        levelCounts[level] = (levelCounts[level] || 0) + 1;
      }
    });

    res.status(200).json(levelCounts);
  } catch (error) {
    console.error('Error getting module level distribution:', error);
    res.status(500).json({ error: 'Failed to get module level distribution' });
  }
};

// Get filter options for modules
const moduleFilterOptions = async (req, res, next) => {
  try {
    // Get year parameter (default to 2026, or 'all' for all years)
    const year = req.query.year || '2026';

    let allData = [];

    if (year === 'all') {
      // Load all years (backward compatibility, but slower)
      const module2024 = getModuleDataForYear('2024');
      const module2025 = getModuleDataForYear('2025');
      const module2026 = getModuleDataForYear('2026');

      allData = [
        ...module2024.data,
        ...module2025.data,
        ...module2026.data
      ];
    } else {
      // Load only requested year (much faster)
      const moduleData = getModuleDataForYear(year);
      allData = moduleData.data;
    }

    // Get school-to-college mapping for deriving college from school
    const schoolToCollegeMap = getSchoolToCollegeMapping();

    // Extract unique values for each filterable field
    const levels = new Set();
    const semesters = new Set();
    const schools = new Set();
    const departments = new Set();
    const colleges = new Set();

    allData.forEach(mod => {
      // Level - remove 'L' prefix for cleaner display
      if (mod.level) {
        const level = mod.level.replace('L', '');
        levels.add(level);
      }

      // Semester - include "Not Yet Specified" for empty/null values
      if (mod.semester) {
        semesters.add(mod.semester);
      } else {
        semesters.add("Not Yet Specified");
      }

      // School
      if (mod.school) {
        schools.add(mod.school);
      }

      // Department
      if (mod.dept) {
        departments.add(mod.dept);
      }

      // College - use mod.college if available, otherwise derive from school mapping
      let collegeValue = mod.college;
      if (!collegeValue && mod.school) {
        collegeValue = schoolToCollegeMap[mod.school];
      }
      if (collegeValue) {
        colleges.add(collegeValue);
      }
    });

    // Convert Sets to sorted arrays
    const filterOptions = {
      levels: Array.from(levels).sort(),
      semesters: Array.from(semesters).sort(),
      schools: Array.from(schools).sort(),
      departments: Array.from(departments).sort(),
      colleges: Array.from(colleges).sort()
    };

    res.status(200).json(filterOptions);
  } catch (error) {
    console.error('Error getting module filter options:', error);
    res.status(500).json({ error: 'Failed to get module filter options' });
  }
};


// Get school/college activity (module counts per school)
const schoolActivity = async (req, res, next) => {
  try {
    // Get optional college filter from query parameters
    const collegesParam = req.query.colleges;
    const selectedColleges = collegesParam
      ? collegesParam.split(',').map(c => c.trim())
      : null;

    // Get school-to-college mapping (2KB file vs 430MB of programme data)
    const schoolToCollegeMap = selectedColleges && selectedColleges.length > 0
      ? getSchoolToCollegeMapping()
      : {};

    // Combine module data from all years
    const module2024 = getModuleDataForYear('2024');
    const module2025 = getModuleDataForYear('2025');
    const module2026 = getModuleDataForYear('2026');

    let allData = [
      ...module2024.data,
      ...module2025.data,
      ...module2026.data
    ];

    // Filter by selected colleges if specified (using school-to-college mapping)
    if (selectedColleges && selectedColleges.length > 0) {
      allData = allData.filter(mod => {
        if (!mod.school) return false;
        const college = schoolToCollegeMap[mod.school];
        return college && selectedColleges.includes(college);
      });
    }

    // Count modules by school
    const schoolCounts = {};
    allData.forEach(mod => {
      if (mod.school) {
        schoolCounts[mod.school] = (schoolCounts[mod.school] || 0) + 1;
      }
    });

    // Sort by count descending and take top 10
    const sortedSchools = Object.entries(schoolCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .reduce((acc, [school, count]) => {
        acc[school] = count;
        return acc;
      }, {});

    res.status(200).json(sortedSchools);
  } catch (error) {
    console.error('Error getting school activity:', error);
    res.status(500).json({ error: 'Failed to get school activity' });
  }
};

/**
 * Get module credits distribution with optional filters
 * Query params: level (optional), college (optional)
 */
const moduleCreditsDistribution = async (req, res, next) => {
  try {
    const { level, college } = req.query;

    // Use 2026 data as the most recent (loaded via cache)
    const moduleDataset = getModuleDataForYear('2026');
    let data = moduleDataset.data;

    // Get school-to-college mapping for college filtering
    const schoolToCollegeMap = getSchoolToCollegeMapping();

    // Apply level filter if provided
    if (level) {
      data = data.filter(mod => {
        if (!mod.level) return false;
        const modLevel = mod.level.replace('L', ''); // Remove 'L' prefix: LC -> C, LI -> I
        return modLevel === level;
      });
    }

    // Apply college filter if provided
    if (college) {
      data = data.filter(mod => {
        if (!mod.school) return false;
        const modCollege = schoolToCollegeMap[mod.school];
        return modCollege === college;
      });
    }

    // Count modules by credits
    const creditsCounts = {};
    data.forEach(mod => {
      if (mod.credits) {
        creditsCounts[mod.credits] = (creditsCounts[mod.credits] || 0) + 1;
      }
    });

    // Sort by credit value ascending
    const sortedCredits = Object.entries(creditsCounts)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .reduce((acc, [credits, count]) => {
        acc[credits] = count;
        return acc;
      }, {});

    res.status(200).json(sortedCredits);
  } catch (error) {
    console.error('Error getting module credits distribution:', error);
    res.status(500).json({ error: 'Failed to get module credits distribution' });
  }
};

// Send module change notification email
const notifyModuleChange = async (req, res, next) => {
  try {
    const { moduleData, field, oldValue, newValue, requesterName } = req.body;

    // Validate request body
    if (!moduleData || !moduleData.code || !moduleData.title || !moduleData.year) {
      return res.status(400).json({
        error: 'Missing required module data (code, title, year)'
      });
    }

    if (!field || !newValue) {
      return res.status(400).json({
        error: 'Missing required fields (field, newValue)'
      });
    }

    // Validate requester name
    if (!requesterName || typeof requesterName !== 'string' || !requesterName.trim()) {
      return res.status(400).json({
        error: 'Missing required field: requesterName'
      });
    }

    // Validate field is one of the allowed fields
    const allowedFields = ['Semester', 'Module Lead'];
    if (!allowedFields.includes(field)) {
      return res.status(400).json({
        error: `Invalid field. Must be one of: ${allowedFields.join(', ')}`
      });
    }

    console.log(`Processing module change notification for ${moduleData.code}: ${field} changed from "${oldValue}" to "${newValue}" (requested by: ${requesterName.trim()})`);

    // Attempt to send email notification
    const result = await sendModuleChangeNotification(moduleData, field, oldValue, newValue, requesterName.trim());

    // Always return success for valid changes, but indicate email status
    if (result.success) {
      res.status(200).json({
        success: true,
        emailSent: true,
        message: 'Change notification sent successfully'
      });
    } else {
      // Change is valid, but email failed - return success with warning
      res.status(200).json({
        success: true,
        emailSent: false,
        emailError: result.message,
        emailConfigured: result.configured !== false,
        message: 'Change recorded, but email notification could not be sent'
      });
    }
  } catch (error) {
    console.error('Error in notifyModuleChange:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send change notification',
      error: error.message
    });
  }
};

module.exports = {
  moduleData,
  moduleAutocompleteData,
  moduleLevelDistribution,
  moduleCreditsDistribution,
  moduleFilterOptions,
  schoolActivity,
  notifyModuleChange,
};
