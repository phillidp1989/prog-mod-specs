const express = require("express");
const router = express.Router();
const { programmeData, autocompleteData } = require('../controllers/programmes');

router.get('/data/:progCode/:cohort/:year', programmeData);
router.get('/autocomplete-data', autocompleteData)

module.exports = router;