/**
 * Input Validation Utilities
 * Validates user input to prevent injection attacks and ensure data integrity
 */

/**
 * Validate programme code format
 * @param {string} progCode - Programme code to validate
 * @returns {Object} - { valid: boolean, error: string }
 */
function validateProgrammeCode(progCode) {
  if (!progCode) {
    return { valid: false, error: 'Programme code is required' };
  }

  if (typeof progCode !== 'string') {
    return { valid: false, error: 'Programme code must be a string' };
  }

  // Programme codes are alphanumeric, 3-6 characters
  const progCodeRegex = /^[A-Z0-9]{3,6}$/i;

  if (!progCodeRegex.test(progCode)) {
    return {
      valid: false,
      error: 'Invalid programme code format. Must be 3-6 alphanumeric characters'
    };
  }

  return { valid: true };
}

/**
 * Validate module code format
 * @param {string} modCode - Module code to validate
 * @returns {Object} - { valid: boolean, error: string }
 */
function validateModuleCode(modCode) {
  if (!modCode) {
    return { valid: false, error: 'Module code is required' };
  }

  if (typeof modCode !== 'string') {
    return { valid: false, error: 'Module code must be a string' };
  }

  // Module codes can have various formats, but typically alphanumeric with possible special chars
  // Example: LI1234, LC1234-01, etc.
  const modCodeRegex = /^[A-Z0-9-]{4,15}$/i;

  if (!modCodeRegex.test(modCode)) {
    return {
      valid: false,
      error: 'Invalid module code format. Must be 4-15 alphanumeric characters (hyphens allowed)'
    };
  }

  return { valid: true };
}

/**
 * Validate academic year
 * @param {string|number} year - Year to validate
 * @returns {Object} - { valid: boolean, error: string }
 */
function validateYear(year) {
  if (!year) {
    return { valid: false, error: 'Year is required' };
  }

  const yearNum = parseInt(year, 10);

  if (isNaN(yearNum)) {
    return { valid: false, error: 'Year must be a number' };
  }

  // Allow years from 2020 to 2030
  const MIN_YEAR = 2020;
  const MAX_YEAR = 2030;

  if (yearNum < MIN_YEAR || yearNum > MAX_YEAR) {
    return {
      valid: false,
      error: `Year must be between ${MIN_YEAR} and ${MAX_YEAR}`
    };
  }

  return { valid: true, value: yearNum };
}

/**
 * Validate cohort type
 * @param {string} cohort - Cohort type to validate
 * @returns {Object} - { valid: boolean, error: string }
 */
function validateCohort(cohort) {
  if (!cohort) {
    return { valid: false, error: 'Cohort type is required' };
  }

  if (typeof cohort !== 'string') {
    return { valid: false, error: 'Cohort must be a string' };
  }

  const validCohorts = ['cohort', 'term'];

  if (!validCohorts.includes(cohort.toLowerCase())) {
    return {
      valid: false,
      error: `Invalid cohort type. Must be one of: ${validCohorts.join(', ')}`
    };
  }

  return { valid: true, value: cohort.toLowerCase() };
}

/**
 * Express middleware to validate programme parameters
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
function validateProgrammeParams(req, res, next) {
  const { progCode, cohort, year } = req.params;

  // Validate programme code
  const progCodeValidation = validateProgrammeCode(progCode);
  if (!progCodeValidation.valid) {
    return res.status(400).json({ error: progCodeValidation.error });
  }

  // Validate cohort
  const cohortValidation = validateCohort(cohort);
  if (!cohortValidation.valid) {
    return res.status(400).json({ error: cohortValidation.error });
  }

  // Validate year
  const yearValidation = validateYear(year);
  if (!yearValidation.valid) {
    return res.status(400).json({ error: yearValidation.error });
  }

  // Add validated values to request
  req.validatedParams = {
    progCode: progCode.toUpperCase(),
    cohort: cohortValidation.value,
    year: yearValidation.value
  };

  next();
}

/**
 * Express middleware to validate module parameters
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
function validateModuleParams(req, res, next) {
  const { modCode, year } = req.params;

  // Validate module code
  const modCodeValidation = validateModuleCode(modCode);
  if (!modCodeValidation.valid) {
    return res.status(400).json({ error: modCodeValidation.error });
  }

  // Validate year
  const yearValidation = validateYear(year);
  if (!yearValidation.valid) {
    return res.status(400).json({ error: yearValidation.error });
  }

  // Add validated values to request
  req.validatedParams = {
    modCode: modCode.toUpperCase(),
    year: yearValidation.value
  };

  next();
}

/**
 * Sanitize string input to prevent XSS
 * @param {string} input - String to sanitize
 * @returns {string} - Sanitized string
 */
function sanitizeString(input) {
  if (typeof input !== 'string') return input;

  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

module.exports = {
  validateProgrammeCode,
  validateModuleCode,
  validateYear,
  validateCohort,
  validateProgrammeParams,
  validateModuleParams,
  sanitizeString
};
