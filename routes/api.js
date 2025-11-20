const express = require("express");
const router = express.Router();
const { programmeData, autocompleteData, programmeFilterOptions, programmeDegreeTypes, progCollegeDistribution, progCampusDistribution } = require('../controllers/programmes');
const { moduleData, moduleAutocompleteData, moduleLevelDistribution, moduleCreditsDistribution, moduleFilterOptions, schoolActivity, notifyModuleChange } = require('../controllers/modules');
const { getUsageStats, getUsageByMonth, getUsageByCollege, getUsageBySchool, getTopSpecs } = require('../controllers/analytics');
const { validateProgrammeParams, validateModuleParams } = require('../utils/validators');
const { rateLimiters } = require('../config/security');

// Programme routes with validation and rate limiting
router.get('/prog-data/:progCode/:cohort/:year',
  rateLimiters.api,
  validateProgrammeParams,
  programmeData
);

router.get('/autocomplete-data',
  rateLimiters.autocomplete,
  autocompleteData
);

// Module routes with validation and rate limiting
router.get('/mod-data/:modCode/:year',
  rateLimiters.api,
  validateModuleParams,
  moduleData
);

router.get('/mod-autocomplete-data',
  rateLimiters.autocomplete,
  moduleAutocompleteData
);

// Module change notification route with rate limiting
router.post('/notify-module-change',
  rateLimiters.api,
  notifyModuleChange
);

// Analytics routes with rate limiting
router.get('/mod-level-distribution',
  rateLimiters.api,
  moduleLevelDistribution
);

router.get('/mod-credits-distribution',
  rateLimiters.api,
  moduleCreditsDistribution
);

router.get('/filter-options/modules',
  rateLimiters.api,
  moduleFilterOptions
);

router.get('/filter-options/programmes',
  rateLimiters.api,
  programmeFilterOptions
);

router.get('/school-activity',
  rateLimiters.api,
  schoolActivity
);

// School-to-college mapping for cascading filters
router.get('/school-college-mapping',
  rateLimiters.api,
  (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const mappingPath = path.join(__dirname, '../controllers/school-college-mapping.json');

    try {
      const mappingData = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
      res.json(mappingData);
    } catch (error) {
      console.error('Error reading school-college mapping:', error);
      res.status(500).json({ error: 'Failed to load school-college mapping' });
    }
  }
);

router.get('/programme-degree-types',
  rateLimiters.api,
  programmeDegreeTypes
);

router.get('/prog-college-distribution',
  rateLimiters.api,
  progCollegeDistribution
);

router.get('/prog-campus-distribution',
  rateLimiters.api,
  progCampusDistribution
);

// Usage analytics routes with rate limiting
router.get('/usage-stats',
  rateLimiters.api,
  getUsageStats
);

router.get('/usage-by-month',
  rateLimiters.api,
  getUsageByMonth
);

router.get('/usage-by-college',
  rateLimiters.api,
  getUsageByCollege
);

router.get('/usage-by-school',
  rateLimiters.api,
  getUsageBySchool
);

router.get('/top-specs',
  rateLimiters.api,
  getTopSpecs
);

module.exports = router;