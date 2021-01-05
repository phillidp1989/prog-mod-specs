const express = require("express");
const router = express.Router();
const { programmeData, autocompleteData } = require('../controllers/programmes');
const { moduleData, moduleAutocompleteData } = require('../controllers/modules');
const extendTimeoutMiddleware = require("../middleware/extendTimeout");

router.get('/prog-data/:progCode/:cohort/:year', programmeData);
router.get('/autocomplete-data', autocompleteData)
router.get('/mod-data/:modCode/:year', moduleData);
router.get('/mod-autocomplete-data', extendTimeoutMiddleware, moduleAutocompleteData)

module.exports = router;