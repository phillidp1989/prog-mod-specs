const express = require("express");
const router = express.Router();
const { programmeData } = require('../controllers/programmes');

router.get('/data', programmeData);

module.exports = router;