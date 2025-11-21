/**
 * Simple Integration Example for External Applications
 *
 * This file shows how to integrate with the Programme/Module Specs API
 * Copy and adapt this code for your application
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE_URL = 'http://localhost:8080';

// ============================================================================
// API CLIENT CLASS
// ============================================================================

class SpecsAPIClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
    this.cache = {
      autocomplete: null,
      moduleAutocomplete: null,
      cacheTime: null
    };
    this.CACHE_DURATION = 60 * 60 * 1000; // 1 hour
  }

  /**
   * Make a GET request to the API
   * @private
   */
  async _request(endpoint) {
    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url);

      // Log rate limit info
      const remaining = response.headers.get('RateLimit-Remaining');
      if (remaining && parseInt(remaining) < 10) {
        console.warn(`⚠️ Only ${remaining} API requests remaining`);
      }

      // Handle errors
      if (response.status === 404) {
        return { error: 'Not found', data: null };
      }

      if (response.status === 429) {
        const reset = response.headers.get('RateLimit-Reset');
        return {
          error: `Rate limit exceeded. Try again in ${reset} seconds`,
          data: null
        };
      }

      if (!response.ok) {
        return {
          error: `HTTP ${response.status}: ${response.statusText}`,
          data: null
        };
      }

      const data = await response.json();
      return { error: null, data };

    } catch (error) {
      console.error('API request failed:', error);
      return { error: error.message, data: null };
    }
  }

  // ==========================================================================
  // PROGRAMME METHODS
  // ==========================================================================

  /**
   * Get programme specification data
   * @param {string} progCode - Programme code (e.g., 'H610')
   * @param {string} cohort - 'cohort' or 'term'
   * @param {string} year - '2024', '2025', or '2026'
   * @returns {Promise<{error: string|null, data: object|null}>}
   */
  async getProgramme(progCode, cohort, year) {
    if (!['cohort', 'term'].includes(cohort)) {
      return { error: 'Cohort must be "cohort" or "term"', data: null };
    }

    if (!['2024', '2025', '2026'].includes(year)) {
      return { error: 'Year must be 2024, 2025, or 2026', data: null };
    }

    return this._request(`/prog-data/${progCode}/${cohort}/${year}`);
  }

  /**
   * Get all programmes for autocomplete (cached for 1 hour)
   * @returns {Promise<{error: string|null, data: object|null}>}
   */
  async getProgrammeAutocomplete() {
    const now = Date.now();

    // Return cached data if still valid
    if (this.cache.autocomplete &&
        this.cache.cacheTime &&
        (now - this.cache.cacheTime) < this.CACHE_DURATION) {
      console.log('📦 Returning cached programme autocomplete data');
      return { error: null, data: this.cache.autocomplete };
    }

    // Fetch fresh data
    const result = await this._request('/autocomplete-data');

    if (!result.error) {
      this.cache.autocomplete = result.data;
      this.cache.cacheTime = now;
    }

    return result;
  }

  /**
   * Get programme filter options
   * @returns {Promise<{error: string|null, data: object|null}>}
   */
  async getProgrammeFilterOptions() {
    return this._request('/filter-options/programmes');
  }

  /**
   * Get programme degree types distribution
   * @returns {Promise<{error: string|null, data: object|null}>}
   */
  async getProgrammeDegreeTypes() {
    return this._request('/programme-degree-types');
  }

  // ==========================================================================
  // MODULE METHODS
  // ==========================================================================

  /**
   * Get module specification data
   * @param {string} modCode - Module code (e.g., '06-21993')
   * @param {string} year - '2024', '2025', or '2026'
   * @returns {Promise<{error: string|null, data: object|null}>}
   */
  async getModule(modCode, year) {
    if (!['2024', '2025', '2026'].includes(year)) {
      return { error: 'Year must be 2024, 2025, or 2026', data: null };
    }

    return this._request(`/mod-data/${modCode}/${year}`);
  }

  /**
   * Get all modules for autocomplete (cached for 1 hour)
   * @returns {Promise<{error: string|null, data: object|null}>}
   */
  async getModuleAutocomplete() {
    const now = Date.now();

    // Return cached data if still valid
    if (this.cache.moduleAutocomplete &&
        this.cache.cacheTime &&
        (now - this.cache.cacheTime) < this.CACHE_DURATION) {
      console.log('📦 Returning cached module autocomplete data');
      return { error: null, data: this.cache.moduleAutocomplete };
    }

    // Fetch fresh data
    const result = await this._request('/mod-autocomplete-data');

    if (!result.error) {
      this.cache.moduleAutocomplete = result.data;
      this.cache.cacheTime = now;
    }

    return result;
  }

  /**
   * Get module filter options
   * @returns {Promise<{error: string|null, data: object|null}>}
   */
  async getModuleFilterOptions() {
    return this._request('/filter-options/modules');
  }

  /**
   * Get module level distribution
   * @returns {Promise<{error: string|null, data: object|null}>}
   */
  async getModuleLevelDistribution() {
    return this._request('/mod-level-distribution');
  }

  // ==========================================================================
  // ANALYTICS METHODS
  // ==========================================================================

  /**
   * Get top 10 schools by module count
   * @returns {Promise<{error: string|null, data: object|null}>}
   */
  async getSchoolActivity() {
    return this._request('/school-activity');
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.autocomplete = null;
    this.cache.moduleAutocomplete = null;
    this.cache.cacheTime = null;
    console.log('✅ Cache cleared');
  }
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

async function examples() {
  const api = new SpecsAPIClient();

  console.log('=== Programme API Examples ===\n');

  // Example 1: Get specific programme data
  console.log('1. Getting programme H610 for cohort 2024...');
  const progResult = await api.getProgramme('H610', 'cohort', '2024');
  if (progResult.error) {
    console.error('❌ Error:', progResult.error);
  } else {
    console.log('✅ Programme:', progResult.data.progTitle);
    console.log('   College:', progResult.data.college);
    console.log('   School:', progResult.data.school);
  }

  console.log('\n2. Getting programme autocomplete data...');
  const autocompleteResult = await api.getProgrammeAutocomplete();
  if (autocompleteResult.error) {
    console.error('❌ Error:', autocompleteResult.error);
  } else {
    const count = Object.keys(autocompleteResult.data).length;
    console.log(`✅ Loaded ${count} programmes for autocomplete`);
  }

  console.log('\n=== Module API Examples ===\n');

  // Example 2: Get specific module data
  console.log('3. Getting module 06-21993 for 2024...');
  const modResult = await api.getModule('06-21993', '2024');
  if (modResult.error) {
    console.error('❌ Error:', modResult.error);
  } else {
    console.log('✅ Module:', modResult.data.title);
    console.log('   Level:', modResult.data.level);
    console.log('   Credits:', modResult.data.credits);
  }

  // Example 3: Get module level distribution
  console.log('\n4. Getting module level distribution...');
  const levelResult = await api.getModuleLevelDistribution();
  if (levelResult.error) {
    console.error('❌ Error:', levelResult.error);
  } else {
    console.log('✅ Distribution:', levelResult.data);
  }

  console.log('\n=== Analytics API Examples ===\n');

  // Example 4: Get school activity
  console.log('5. Getting school activity...');
  const schoolResult = await api.getSchoolActivity();
  if (schoolResult.error) {
    console.error('❌ Error:', schoolResult.error);
  } else {
    console.log('✅ Top Schools:');
    Object.entries(schoolResult.data).slice(0, 3).forEach(([school, count]) => {
      console.log(`   ${school}: ${count} modules`);
    });
  }
}

// ============================================================================
// ERROR HANDLING EXAMPLE
// ============================================================================

async function errorHandlingExample() {
  const api = new SpecsAPIClient();

  console.log('\n=== Error Handling Examples ===\n');

  // Example: Handle 404 (not found)
  console.log('1. Testing invalid programme code...');
  const result1 = await api.getProgramme('INVALID', 'cohort', '2024');
  if (result1.error) {
    console.log('✅ Correctly handled 404:', result1.error);
  }

  // Example: Handle invalid parameters
  console.log('\n2. Testing invalid cohort type...');
  const result2 = await api.getProgramme('H610', 'invalid', '2024');
  if (result2.error) {
    console.log('✅ Correctly validated parameters:', result2.error);
  }

  // Example: Handle invalid year
  console.log('\n3. Testing invalid year...');
  const result3 = await api.getModule('06-21993', '2023');
  if (result3.error) {
    console.log('✅ Correctly validated year:', result3.error);
  }
}

// ============================================================================
// NODE.JS EXPORT (for use in other files)
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpecsAPIClient;
}

// ============================================================================
// RUN EXAMPLES (uncomment to test)
// ============================================================================

// Uncomment the lines below to run the examples:
// examples().catch(console.error);
// errorHandlingExample().catch(console.error);
