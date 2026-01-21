require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const path = require("path");
const csv = require("csvtojson");
const dataCache = require('../utils/cache');
const { normalizeResponse } = require('../utils/encodingNormalizer');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
let filePathSpec = path.join(__dirname, `progspec2021.csv`);
let selectedProg = "";
let selectedCohort = "";
let selectedYear = "";
let reqs = "";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Get programme data for a specific year and cohort type
 * Uses lazy-loading cache to avoid loading all files on startup
 * @param {string} year - Year (2025, 2026, 2027)
 * @param {string} cohortType - 'cohort' or 'term'
 * @returns {Object} - Programme data
 */
function getDataForYear(year, cohortType) {
  const isTerm = cohortType === 'term';
  const prefix = isTerm ? 'progterm' : 'prog';
  const cacheKey = `${prefix}${year}`;
  const filePath = path.join(__dirname, `${prefix}${year}.json`);

  return dataCache.get(cacheKey, filePath);
}

/**
 * Get programme data for a specific year (cohort-based, not term)
 * @param {string} year - Year (2025, 2026, 2027)
 * @returns {Object} - Programme data
 */
function getProgrammeDataForYear(year) {
  return getDataForYear(year, 'cohort');
}

// Function to generate spec
const programmeData = async (req, res, next) => {
  try {
    // Spec
    selectedProg = req.params.progCode;
    selectedCohort = req.params.cohort;
    selectedYear = req.params.year;

    // Load data using cache (lazy-loading)
    const programmeDataset = getDataForYear(selectedYear, selectedCohort);
    const data = programmeDataset.data;

    if (!data) {
      return res.status(404).json({
        error: `Programme data not found for year ${selectedYear}`
      });
    }

  function stripTitle(title) {    
    const lower = title.toLowerCase();
      const result = lower
      .replace("with year in computer science", "")
      .replace("and year in computer science", "")
      .replace("with a year in computer science", "")
      .replace("with year in civic leadership", "")
      .replace("with year in international business", "")
      .replace("with year in psychology", "")
      .replace("with year in ai & computer science", "")
      .replace("with year in ai and computer science", "")
      .replace("with year in artificial intelligence and computer science", "")
      .replace("with industrial experience", "")
      .replace("(with international study year)", "")
      .replace("with year abroad and year in computer science", "")
      .replace("with year abroad", "")
      .replace("with placement year", "")
      .replace("(with year abroad)", "")
      .replace("with study abroad", "")
      .replace("(with study abroad)", "")
      .replace("with international study", "")
      .replace("(with international study)", "")
      .replace("with year in industry", "")
      .replace("with industrial year", "")
      .replace("with industrial placement", "")
      .replace("with semester abroad", "")
      .replace("with foundation year", "")
      .replace("with international year", "")
      .replace("with study in continental europe", "")
      .replace("with professional placement", "")
      .replace("with inverted year abroad", "")
      .replace("full-time", "")
      .replace("part-time.", "").trim();
    // console.log(result);
    return result;
    
    // return title
    //   .toLowerCase()
    //   .replace(
    //     "with year in computer science" |
    //     "with a year in computer science" |
    //     "with industrial experience" |
    //     "(with International Study Year)" |
    //     "with Year Abroad and Year in Computer Science" |
    //       "with year abroad" |
    //       "(with year abroad)" |
    //       "with study abroad" |
    //       "(with study abroad)" |
    //       "with international study" |
    //       "with an international study" |
    //       "(with international study)" |
    //       "with year in industry" |
    //       "with industrial year" |
    //       "with industrial placement" |
    //       "with semester abroad"|
    //       "with foundation year"|
    //       "with international year"|
    //       "with international study"|
    //       "with study in continental europe"|
    //       "with professional placement"|
    //       "with inverted year abroad"|
    //       "Full-time"|
    //       "Part-time"
    //       ,
    //     ""
    //   ).trim();
  }

    const final = data.filter((prog) => prog.progCode === selectedProg);

    // Check if programme was found
    if (final.length === 0 || !final[0]) {
      return res.status(404).json({
        error: `Programme not found: ${selectedProg}`
      });
    }

    final[0].matchedBoolean = false;

    if (data.some((prog) => stripTitle(prog.progTitle) === stripTitle(final[0].progTitle) && prog.progCode !== final[0].progCode)) {
      console.log('test');
      const matchedProgs = JSON.stringify(
        data.filter((prog) => stripTitle(prog.progTitle) === stripTitle(final[0].progTitle) && prog.progCode !== final[0].progCode).map((prog) => `${prog.progCode} - ${prog.shortTitle}`)
        )
        // Remove duplicates from matchedProgs
        const uniqueMatchedProgs = [...new Set(JSON.parse(matchedProgs))];
        final[0].matchedProgs = uniqueMatchedProgs;
        final[0].matchedBoolean = true;
      }

    // Data quality flags
    final[0].qualityFlags = [];

    // Check: Missing Aims
    if (!final[0].aims || final[0].aims.length === 0) {
        final[0].qualityFlags.push({
            type: 'warning',
            code: 'NO_AIMS',
            message: 'No programme aims specified'
        });
    } else if (final[0].aims.length < 3) {
        final[0].qualityFlags.push({
            type: 'info',
            code: 'FEW_AIMS',
            message: `Only ${final[0].aims.length} programme aim(s) specified`
        });
    }

    // Check: Missing Knowledge Outcomes
    if (!final[0].knowledge?.outcome || final[0].knowledge.outcome.length === 0) {
        final[0].qualityFlags.push({
            type: 'warning',
            code: 'NO_KNOWLEDGE_OUTCOMES',
            message: 'No knowledge & understanding outcomes specified'
        });
    }

    // Check: Missing Skills Outcomes
    if (!final[0].skills?.outcome || final[0].skills.outcome.length === 0) {
        final[0].qualityFlags.push({
            type: 'warning',
            code: 'NO_SKILLS_OUTCOMES',
            message: 'No skills & other attributes outcomes specified'
        });
    }

    // Check: Missing Benchmark Statement
    if (!final[0].benchmark || !final[0].benchmark.trim()) {
        final[0].qualityFlags.push({
            type: 'info',
            code: 'NO_BENCHMARK',
            message: 'No benchmark statement specified'
        });
    }

    // Insert data into Supabase with proper error handling
    async function insertData() {
      const { data, error } = await supabase
        .from('specs')
        .insert([{
          prog_or_mod: 'prog',
          code: final[0].progCode,
          title: final[0].progTitle,
          college: final[0].college,
          school: final[0].school,
          department: final[0].dept1,
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

    res.status(200).json(normalizeResponse(final[0]));
  } catch (error) {
    console.error('Error in programmeData:', error);
    next(error);
  }
};

// Cache for autocomplete data (1 hour TTL)
let autocompleteCache = null;
let autocompleteCacheTime = 0;
const AUTOCOMPLETE_CACHE_TTL = 60 * 60 * 1000; // 1 hour

const autocompleteData = async (req, res, next) => {
  try {
    // Check if cache is valid
    const now = Date.now();
    if (autocompleteCache && (now - autocompleteCacheTime) < AUTOCOMPLETE_CACHE_TTL) {
      console.log('Returning cached autocomplete data');
      return res.status(200).json(autocompleteCache);
    }

    // Load CSV data
    const initialSpecArray = await csv().fromFile(filePathSpec);
    const filteredInitialData = initialSpecArray.filter((el) => {
    if (el["Degree Long Desc"] === "Postgraduate Affiliate") {
      return false;
    }
    if (el["Degree Long Desc"] == "Undergraduate Affiliate") {
      return false;
    }
    if (el["Degree Long Desc"] === "Undergraduate Affiliate") {
      return false;
    }
    if (el["Degree Long Desc"] === "DA wrapper") {
      return false;
    }
    if (el["Degree Long Desc"] === "Certificate") {
      return false;
    }
    if (
      el["Degree Long Desc"] ===
      "Common European Framework of Reference for Languages B2"
    ) {
      return false;
    }
    if (el["Degree Long Desc"] === "Diploma") {
      return false;
    }
    if (el["Degree Long Desc"] === "Doctor of Science") {
      return false;
    }
    if (el["Degree Long Desc"] === "Master of Philosophy") {
      return false;
    }
    if (el["Degree Long Desc"] === "Master of Letters") {
      return false;
    }
    if (el["Degree Long Desc"] === "Doctor of Philosophy") {
      return false;
    }
    if (el["Degree Long Desc"] === "Visiting Research Student") {
      return false;
    }
    if (el["Degree Code"] == "071") {
      return false;
    }

    if (el["Degree Long Desc"].includes("AQ")) {
      return false;
    }
    return true;
    });

    const initialData = {};
    filteredInitialData.forEach((prog) => {
    if (
      prog["Prog Mode Desc"] === "Full-time according to funding coun" ||
      prog["Prog Mode Desc"] === "Full-time" ||
      prog["Prog Mode Desc"] === "Other full-time"
    ) {
      prog["Prog Mode Desc"] = "FT";
    } else if (prog["Prog Mode Desc"] === "Part-time.") {
      prog["Prog Mode Desc"] = "PT";
    }
    switch (prog["Degree Long Desc"]) {
      case "Postgraduate Certificate in Education":
        prog["Degree Long Desc"] = "PGCE";
        break;
      case "Postgraduate Certificate":
        prog["Degree Long Desc"] = "PGCert";
        break;
      case "Doctor of Philosophy":
        prog["Degree Long Desc"] = "PhD";
        break;
      case "Doctor of Medicine":
        prog["Degree Long Desc"] = "MD";
        break;
      case "Bachelor of Arts":
        prog["Degree Long Desc"] = "BA";
        break;
      case "Certificate of Higher Education":
        prog["Degree Long Desc"] = "CertHE";
        break;
      case "Master in Science":
        prog["Degree Long Desc"] = "MSci";
        break;
      case "Bachelor of Science":
        prog["Degree Long Desc"] = "BSc";
        break;
      case "Visiting Research Student":
        prog["Degree Long Desc"] = "PG VRS";
        break;
      case "Master of Arts":
        prog["Degree Long Desc"] = "MA";
        break;
      case "Master of Science":
        prog["Degree Long Desc"] = "MSc";
        break;
      case "Master of Philosophy":
        prog["Degree Long Desc"] = "MPhil";
        break;
      case "Postgraduate Diploma":
        prog["Degree Long Desc"] = "PGDip";
        break;
      case "Master of Engineering":
        prog["Degree Long Desc"] = "MEng";
        break;
      case "Master of Laws":
        prog["Degree Long Desc"] = "LLM";
        break;
      case "Subject Knowledge Enhancement":
        prog["Degree Long Desc"] = "SKE";
        break;
      case "Advanced Certificate":
        prog["Degree Long Desc"] = "AdCert";
        break;
      case "Doctor of Philosophy with Integrated Study":
        prog["Degree Long Desc"] = "PhD with Integrated Study";
        break;
      case "Doctor of Clinical Psychology":
        prog["Degree Long Desc"] = "ClinPsyD";
        break;
      case "Doctorate in Forensic Psychology Practice":
        prog["Degree Long Desc"] = "ForenPsyD";
        break;
      case "Bachelor of Medicine and Bachelor of Surgery":
        prog["Degree Long Desc"] = "MBChB";
        break;
      case "Master of Education":
        prog["Degree Long Desc"] = "MEd";
        break;
      case "Master of Research":
        prog["Degree Long Desc"] = "MRes";
        break;
      case "Bachelor of Laws":
        prog["Degree Long Desc"] = "LLB";
        break;
      case "Master of Public Administration":
        prog["Degree Long Desc"] = "MPA";
        break;
      case "Graduate Certificate":
        prog["Degree Long Desc"] = "GCert";
        break;
      case "Undergraduate Certificate":
        prog["Degree Long Desc"] = "UGCert";
        break;
      case "Undergraduate Diploma":
        prog["Degree Long Desc"] = "UGDip";
        break;
      case "Bachelor of Philosophy":
        prog["Degree Long Desc"] = "BPhil";
        break;
      case "Bachelor of Engineering":
        prog["Degree Long Desc"] = "BEng";
        break;
      case "Doctorate in Sport and Exercise Sciences":
        prog["Degree Long Desc"] = "DSportExSc";
        break;
      case "Bachelor of Medical Science":
        prog["Degree Long Desc"] = "BMedSc";
        break;
      case "Forensic Clinical Psychology Doctorate":
        prog["Degree Long Desc"] = "ForenClinPsyD";
        break;
      case "Master of Nursing":
        prog["Degree Long Desc"] = "MNurs";
        break;
      case "Bachelor of Nursing":
        prog["Degree Long Desc"] = "BNurs";
        break;
      case "Bachelor of Music":
        prog["Degree Long Desc"] = "BMus";
        break;
      case "Bachelor of Dental Surgery":
        prog["Degree Long Desc"] = "BDS";
        break;
      case "Master of Public Health":
        prog["Degree Long Desc"] = "MPH";
        break;
      case "Master of Pharmacy":
        prog["Degree Long Desc"] = "MPharm";
        break;
      case "Master of Business Administration":
        prog["Degree Long Desc"] = "MBA";
        break;
      default:
        break;
    }
      // Include school and college for catalogue cards
      const school = prog["Division Desc"] || "";
      const college = prog["College Desc"] || "";
      const progInfo = `${prog["Prog Code"]} - ${prog["Degree Long Desc"]} ${prog["Prog Long Title"]} ${prog["Prog Mode Desc"]} (${prog["Campus Desc"]}) [${school}] {${college}}`;
      initialData[progInfo] = null;
    });

    // Update cache
    autocompleteCache = initialData;
    autocompleteCacheTime = Date.now();

    res.status(200).json(normalizeResponse(initialData));
  } catch (error) {
    console.error('Error in autocompleteData:', error);
    next(error);
  }
};

// Get filter options for programmes
const programmeFilterOptions = async (req, res, next) => {
  try {
    const csvData = await csv().fromFile(filePathSpec);

    // Apply the same filters as autocomplete to only get relevant programmes
    const filteredData = csvData.filter((el) => {
      // Exclude certain degree types (same logic as autocompleteData)
      const excludedDegrees = [
        "Postgraduate Affiliate", "Undergraduate Affiliate", "DA wrapper",
        "Certificate", "Diploma", "Doctor of Science", "Master of Philosophy",
        "Master of Letters", "Doctor of Philosophy", "Visiting Research Student"
      ];

      if (excludedDegrees.includes(el["Degree Long Desc"])) {
        return false;
      }

      if (el["Degree Long Desc"]?.includes("AQ")) {
        return false;
      }

      if (el["Degree Code"] == "071") {
        return false;
      }

      // Exclude CEFR B2
      if (el["Degree Long Desc"] === "Common European Framework of Reference for Languages B2") {
        return false;
      }

      return true;
    });

    // Helper function to categorize qualification into level
    const categorizeLevel = (degreeDesc) => {
      if (!degreeDesc) return null;

      const desc = degreeDesc.toLowerCase();

      // Undergraduate
      if (desc.includes('bachelor') || desc.includes('foundation degree') ||
          desc.includes('certificate of higher education') || desc.includes('diploma of higher education') ||
          desc.includes('undergraduate certificate') || desc.includes('undergraduate diploma')) {
        return 'Undergraduate';
      }

      // Postgraduate Taught
      if (desc.includes('master') || desc.includes('postgraduate certificate') ||
          desc.includes('postgraduate diploma') || desc.includes('pgce') ||
          desc.includes('graduate certificate') || desc.includes('graduate diploma') ||
          desc.includes('postgraduate microcredential')) {
        return 'Postgraduate Taught';
      }

      // Postgraduate Research
      if (desc.includes('doctor') || desc.includes('phd') || desc.includes('mphil') ||
          desc.includes('mres')) {
        return 'Postgraduate Research';
      }

      return null;
    };

    // Extract unique values for each filterable field from filtered data only
    const colleges = new Set();
    const schools = new Set();
    const campuses = new Set();
    const modes = new Set();
    const degreeTypes = new Set();
    const levels = new Set();
    const departments = new Set();
    const divisions = new Set();

    filteredData.forEach(prog => {
      // College (filter out unwanted colleges)
      if (prog["College Desc"]) {
        const college = prog["College Desc"];
        if (college !== "Arts and Social Sciences (DNU)" &&
            college !== "College not applicable") {
          colleges.add(college);
        }
      }

      // School (Division)
      if (prog["Division Desc"]) {
        schools.add(prog["Division Desc"]);
      }

      // Campus - only from filtered programmes
      if (prog["Campus Desc"]) {
        campuses.add(prog["Campus Desc"]);
      }

      // Mode (Full-time, Part-time, etc.)
      if (prog["Prog Mode Desc"]) {
        modes.add(prog["Prog Mode Desc"]);
      }

      // Degree Type (BSc, MSc, BA, etc.)
      if (prog["Degree Long Desc"]) {
        degreeTypes.add(prog["Degree Long Desc"]);
      }

      // Level (Undergraduate, Postgraduate Taught, Postgraduate Research)
      const level = categorizeLevel(prog["Degree Long Desc"]);
      if (level) {
        levels.add(level);
      }

      // Department
      if (prog["Dept1 Short Desc"]) {
        departments.add(prog["Dept1 Short Desc"]);
      }

      // Division
      if (prog["Division Desc"]) {
        divisions.add(prog["Division Desc"]);
      }
    });

    // Convert Sets to sorted arrays (with custom sort for levels)
    const levelOrder = ['Undergraduate', 'Postgraduate Taught', 'Postgraduate Research'];
    const sortedLevels = Array.from(levels).sort((a, b) => {
      return levelOrder.indexOf(a) - levelOrder.indexOf(b);
    });

    const filterOptions = {
      colleges: Array.from(colleges).sort(),
      schools: Array.from(schools).sort(),
      campuses: Array.from(campuses).sort(),
      modes: Array.from(modes).sort(),
      degreeTypes: Array.from(degreeTypes).sort(),
      levels: sortedLevels,
      departments: Array.from(departments).sort(),
      divisions: Array.from(divisions).sort()
    };

    res.status(200).json(filterOptions);
  } catch (error) {
    console.error('Error getting programme filter options:', error);
    res.status(500).json({ error: 'Failed to get programme filter options' });
  }
};

// UG/PG degree type categorization
const undergraduateDegrees = [
  'Bachelor of Arts', 'Bachelor of Science', 'Bachelor of Engineering',
  'Bachelor of Philosophy', 'Bachelor of Medical Science', 'Bachelor of Nursing',
  'Bachelor of Music', 'Bachelor of Dental Surgery', 'Bachelor of Medicine and Bachelor of Surgery',
  'Bachelor of Laws', 'Certificate of Higher Education', 'Undergraduate Certificate',
  'Undergraduate Diploma', 'Diploma of Higher Education'
];

const postgraduateDegrees = [
  'Master of Science', 'Master of Arts', 'Master of Engineering', 'Master of Philosophy',
  'Postgraduate Diploma', 'Master of Laws', 'Subject Knowledge Enhancement',
  'Advanced Certificate', 'Doctor of Clinical Psychology', 'Doctorate in Forensic Psychology Practice',
  'Master of Education', 'Master of Research', 'Master of Business Administration',
  'Master of Public Administration', 'Graduate Certificate', 'Master of Nursing',
  'Master of Public Health', 'Master of Pharmacy', 'Doctor of Medicine',
  'Doctor of Philosophy', 'Doctor of Philosophy with Integrated Study',
  'Visiting Research Student', 'Postgraduate Certificate in Education',
  'Postgraduate Certificate', 'Doctorate in Sport and Exercise Sciences',
  'Forensic Clinical Psychology Doctorate', 'Non-credit Bearing Short Course',
  'Postgraduate Microcredential', 'Postgraduate Affiliate', 'Master in Science',
  'Doctor of Science', 'Master of Letters'
];

// Get programme degree type distribution
const programmeDegreeTypes = async (req, res, next) => {
  try {
    // Get optional level filter from query parameters ('ug', 'pg', or 'all')
    const levelFilter = req.query.level || 'all';

    // Get year parameter (default to 2027, or 'all' for all years)
    const year = req.query.year || '2027';

    let allData = [];

    if (year === 'all') {
      // Load all years (backward compatibility, but slower)
      const prog2025 = getDataForYear('2025', 'cohort');
      const prog2026 = getDataForYear('2026', 'cohort');
      const prog2027 = getDataForYear('2027', 'cohort');
      const progterm2025 = getDataForYear('2025', 'term');
      const progterm2026 = getDataForYear('2026', 'term');
      const progterm2027 = getDataForYear('2027', 'term');

      allData = [
        ...prog2025.data,
        ...prog2026.data,
        ...prog2027.data,
        ...progterm2025.data,
        ...progterm2026.data,
        ...progterm2027.data
      ];
    } else {
      // Load only requested year (much faster)
      const progCohort = getDataForYear(year, 'cohort');
      const progTerm = getDataForYear(year, 'term');

      allData = [
        ...progCohort.data,
        ...progTerm.data
      ];
    }

    // Count by degree type (qualification)
    const degreeTypeCounts = {};

    allData.forEach(prog => {
      const longQual = prog["longQual"] || prog["Long Qual"]; // Try both formats
      if (longQual) {
        // Apply level filter
        if (levelFilter === 'ug') {
          if (!undergraduateDegrees.includes(longQual)) return;
        } else if (levelFilter === 'pg') {
          if (!postgraduateDegrees.includes(longQual)) return;
        }

        degreeTypeCounts[longQual] = (degreeTypeCounts[longQual] || 0) + 1;
      }
    });

    // Sort by count descending and take top 15
    const sortedDegreeTypes = Object.entries(degreeTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .reduce((acc, [degreeType, count]) => {
        acc[degreeType] = count;
        return acc;
      }, {});

    res.status(200).json(sortedDegreeTypes);
  } catch (error) {
    console.error('Error getting programme degree types:', error);
    res.status(500).json({ error: 'Failed to get programme degree types' });
  }
};

// Get programme college distribution for charts
const progCollegeDistribution = async (req, res, next) => {
  try {
    // Use CSV file (same as autocomplete) for consistency with displayed programme count
    const filePathSpec = path.join(__dirname, `progspec2021.csv`);
    const data = await csv().fromFile(filePathSpec);

    // Apply same filtering logic as autocomplete (lines 199-247)
    const filteredData = data.filter((el) => {
      if (el["Degree Long Desc"] === "Postgraduate Affiliate") return false;
      if (el["Degree Long Desc"] == "Undergraduate Affiliate") return false;
      if (el["Degree Long Desc"] === "Undergraduate Affiliate") return false;
      if (el["Degree Long Desc"] === "DA wrapper") return false;
      if (el["Degree Long Desc"] === "Certificate") return false;
      if (el["Degree Long Desc"] === "Common European Framework of Reference for Languages B2") return false;
      if (el["Degree Long Desc"] === "Diploma") return false;
      if (el["Degree Long Desc"] === "Doctor of Science") return false;
      if (el["Degree Long Desc"] === "Master of Philosophy") return false;
      if (el["Degree Long Desc"] === "Master of Letters") return false;
      if (el["Degree Long Desc"] === "Doctor of Philosophy") return false;
      if (el["Degree Long Desc"] === "Visiting Research Student") return false;
      if (el["Degree Code"] == "071") return false;
      if (el["Degree Long Desc"] && el["Degree Long Desc"].includes("AQ")) return false;
      return true;
    });

    // Count programmes by college (excluding unwanted colleges)
    const collegeCounts = {};
    filteredData.forEach(prog => {
      const college = prog["College Desc"];
      if (college &&
          college !== "Arts and Social Sciences (DNU)" &&
          college !== "College not applicable") {
        collegeCounts[college] = (collegeCounts[college] || 0) + 1;
      }
    });

    // Sort by count descending
    const sortedColleges = Object.entries(collegeCounts)
      .sort((a, b) => b[1] - a[1])
      .reduce((acc, [college, count]) => {
        acc[college] = count;
        return acc;
      }, {});

    res.status(200).json(sortedColleges);
  } catch (error) {
    console.error('Error getting programme college distribution:', error);
    res.status(500).json({ error: 'Failed to get programme college distribution' });
  }
};

// Get programme campus distribution for charts
const progCampusDistribution = async (req, res, next) => {
  try {
    // Use CSV file (same as autocomplete) for consistency with displayed programme count
    const filePathSpec = path.join(__dirname, `progspec2021.csv`);
    const data = await csv().fromFile(filePathSpec);

    // Apply same filtering logic as autocomplete (lines 199-247)
    const filteredData = data.filter((el) => {
      if (el["Degree Long Desc"] === "Postgraduate Affiliate") return false;
      if (el["Degree Long Desc"] == "Undergraduate Affiliate") return false;
      if (el["Degree Long Desc"] === "Undergraduate Affiliate") return false;
      if (el["Degree Long Desc"] === "DA wrapper") return false;
      if (el["Degree Long Desc"] === "Certificate") return false;
      if (el["Degree Long Desc"] === "Common European Framework of Reference for Languages B2") return false;
      if (el["Degree Long Desc"] === "Diploma") return false;
      if (el["Degree Long Desc"] === "Doctor of Science") return false;
      if (el["Degree Long Desc"] === "Master of Philosophy") return false;
      if (el["Degree Long Desc"] === "Master of Letters") return false;
      if (el["Degree Long Desc"] === "Doctor of Philosophy") return false;
      if (el["Degree Long Desc"] === "Visiting Research Student") return false;
      if (el["Degree Code"] == "071") return false;
      if (el["Degree Long Desc"] && el["Degree Long Desc"].includes("AQ")) return false;
      return true;
    });

    // Count programmes by campus
    const campusCounts = {};
    filteredData.forEach(prog => {
      const campus = prog["Campus Desc"];
      if (campus) {
        campusCounts[campus] = (campusCounts[campus] || 0) + 1;
      }
    });

    // Sort by count descending
    const sortedCampuses = Object.entries(campusCounts)
      .sort((a, b) => b[1] - a[1])
      .reduce((acc, [campus, count]) => {
        acc[campus] = count;
        return acc;
      }, {});

    res.status(200).json(sortedCampuses);
  } catch (error) {
    console.error('Error getting programme campus distribution:', error);
    res.status(500).json({ error: 'Failed to get programme campus distribution' });
  }
};

module.exports = {
  programmeData,
  autocompleteData,
  programmeFilterOptions,
  programmeDegreeTypes,
  progCollegeDistribution,
  progCampusDistribution,
};
