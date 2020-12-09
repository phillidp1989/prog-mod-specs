const express = require("express");
const router = express.Router();
const { programmeData, autocompleteData } = require('../controllers/programmes');
const { moduleData, moduleAutocompleteData } = require('../controllers/modules');

router.get('/data/:progCode/:cohort/:year', programmeData);
router.get('/autocomplete-data', autocompleteData)
router.get('/mod-data/:modCode/:year', moduleData);
router.get('/mod-autocomplete-data', moduleAutocompleteData)

module.exports = router;