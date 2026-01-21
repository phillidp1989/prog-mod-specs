/**
 * Deep Search Index Manager
 * Uses FlexSearch for fast full-text search across programmes and modules
 * Supports advanced query syntax: exact phrases, AND/OR, exclusions
 */

const { Document } = require('flexsearch');
const dataCache = require('../utils/cache');
const path = require('path');
const fs = require('fs');
const { parseQuery, matchesQueryCriteria, getFlexSearchQuery, getModuleContent, getProgrammeContent } = require('./queryParser');

// School-to-college mapping for modules (cached)
let schoolToCollegeMapping = null;
function getSchoolToCollegeMapping() {
  if (!schoolToCollegeMapping) {
    const mappingPath = path.join(__dirname, '../controllers/school-college-mapping.json');
    const mappingData = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
    schoolToCollegeMapping = mappingData.mapping;
  }
  return schoolToCollegeMapping;
}

class SearchIndexManager {
  constructor() {
    this.moduleIndexes = {};  // { '2025': Document, '2026': Document, '2027': Document }
    this.programmeIndexes = {}; // { '2025': Document, '2026': Document, '2027': Document }
    this.indexBuilding = {}; // Track ongoing builds to prevent duplicates
  }

  /**
   * Build or retrieve module search index for a year
   */
  async getModuleIndex(year) {
    if (this.moduleIndexes[year]) {
      return this.moduleIndexes[year];
    }

    // Prevent duplicate builds
    if (this.indexBuilding[`module${year}`]) {
      return this.indexBuilding[`module${year}`];
    }

    this.indexBuilding[`module${year}`] = this.buildModuleIndex(year);
    const index = await this.indexBuilding[`module${year}`];
    delete this.indexBuilding[`module${year}`];
    return index;
  }

  /**
   * Build module search index
   */
  async buildModuleIndex(year) {
    console.log(`Building module search index for ${year}...`);
    const startTime = Date.now();

    const index = new Document({
      tokenize: 'forward',
      resolution: 9,
      document: {
        id: 'id',
        index: [
          { field: 'code', tokenize: 'strict' },
          { field: 'title', tokenize: 'forward' },
          { field: 'school', tokenize: 'forward' },
          { field: 'dept', tokenize: 'forward' },
          { field: 'lead', tokenize: 'forward' },
          { field: 'description', tokenize: 'forward' },
          { field: 'outcomes', tokenize: 'forward' },
          { field: 'summative', tokenize: 'forward' },
          { field: 'formative', tokenize: 'forward' }
        ],
        store: ['code', 'title', 'school', 'dept', 'level', 'credits', 'semester', 'campus', 'lead']
      }
    });

    // Load module data
    const filePath = path.join(__dirname, `../controllers/module${year}.json`);
    const moduleData = dataCache.get(`module${year}`, filePath);

    if (!moduleData || !moduleData.data) {
      console.error(`No module data found for year ${year}`);
      return index;
    }

    // Index each module
    for (let i = 0; i < moduleData.data.length; i++) {
      const mod = moduleData.data[i];

      // Safely convert values to strings
      const safeString = (val) => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'string') return val;
        return String(val);
      };

      const safeJoin = (arr) => {
        if (!Array.isArray(arr)) return '';
        return arr.map(item => {
          if (typeof item === 'object' && item !== null) {
            return safeString(item.outcome || item.text || '');
          }
          return safeString(item);
        }).filter(Boolean).join(' ');
      };

      index.add({
        id: i,
        code: safeString(mod.code),
        title: safeString(mod.title),
        school: safeString(mod.school),
        dept: safeString(mod.dept),
        lead: safeString(mod.lead),
        level: safeString(mod.level),
        credits: mod.credits || 0,
        semester: safeString(mod.semester),
        campus: safeString(mod.campus),
        description: safeJoin(mod.description),
        outcomes: safeJoin(mod.outcomes),
        summative: safeJoin(mod.summative),
        formative: safeJoin(mod.formative)
      });
    }

    this.moduleIndexes[year] = index;
    console.log(`Module index for ${year} built in ${Date.now() - startTime}ms (${moduleData.data.length} modules)`);
    return index;
  }

  /**
   * Build or retrieve programme search index for a year
   */
  async getProgrammeIndex(year) {
    if (this.programmeIndexes[year]) {
      return this.programmeIndexes[year];
    }

    if (this.indexBuilding[`prog${year}`]) {
      return this.indexBuilding[`prog${year}`];
    }

    this.indexBuilding[`prog${year}`] = this.buildProgrammeIndex(year);
    const index = await this.indexBuilding[`prog${year}`];
    delete this.indexBuilding[`prog${year}`];
    return index;
  }

  /**
   * Build programme search index
   */
  async buildProgrammeIndex(year) {
    console.log(`Building programme search index for ${year}...`);
    const startTime = Date.now();

    const index = new Document({
      tokenize: 'forward',
      resolution: 9,
      document: {
        id: 'id',
        index: [
          { field: 'progCode', tokenize: 'strict' },
          { field: 'progTitle', tokenize: 'forward' },
          { field: 'shortTitle', tokenize: 'forward' },
          { field: 'longTitle', tokenize: 'forward' },
          { field: 'longQual', tokenize: 'forward' },
          { field: 'college', tokenize: 'forward' },
          { field: 'school', tokenize: 'forward' },
          { field: 'subjects', tokenize: 'forward' },
          { field: 'aims', tokenize: 'forward' },
          { field: 'knowledgeOutcome', tokenize: 'forward' },
          { field: 'skillsOutcome', tokenize: 'forward' }
        ],
        store: ['progCode', 'progTitle', 'shortTitle', 'longTitle', 'longQual', 'college', 'school', 'mode', 'campus']
      }
    });

    // Load programme data
    const filePath = path.join(__dirname, `../controllers/prog${year}.json`);
    const progData = dataCache.get(`prog${year}`, filePath);

    if (!progData || !progData.data) {
      console.error(`No programme data found for year ${year}`);
      return index;
    }

    // Index each programme
    for (let i = 0; i < progData.data.length; i++) {
      const prog = progData.data[i];

      // Safely convert values to strings
      const safeString = (val) => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'string') return val;
        return String(val);
      };

      const safeJoin = (arr) => {
        if (!Array.isArray(arr)) return '';
        return arr.map(item => safeString(item)).filter(Boolean).join(' ');
      };

      // Combine subjects
      const subjects = [prog.subject1, prog.subject2, prog.subject3]
        .map(s => safeString(s))
        .filter(s => s.trim())
        .join(' ');

      // Extract knowledge outcomes
      const knowledgeOutcome = prog.knowledge && Array.isArray(prog.knowledge.outcome)
        ? safeJoin(prog.knowledge.outcome)
        : '';

      // Extract skills outcomes
      const skillsOutcome = prog.skills && Array.isArray(prog.skills.outcome)
        ? safeJoin(prog.skills.outcome)
        : '';

      index.add({
        id: i,
        progCode: safeString(prog.progCode),
        progTitle: safeString(prog.progTitle),
        shortTitle: safeString(prog.shortTitle),
        longTitle: safeString(prog.longTitle),
        longQual: safeString(prog.longQual),
        college: safeString(prog.college),
        school: safeString(prog.school),
        mode: safeString(prog.mode),
        campus: safeString(prog.campus),
        subjects: subjects,
        aims: safeJoin(prog.aims),
        knowledgeOutcome: knowledgeOutcome,
        skillsOutcome: skillsOutcome
      });
    }

    this.programmeIndexes[year] = index;
    console.log(`Programme index for ${year} built in ${Date.now() - startTime}ms (${progData.data.length} programmes)`);
    return index;
  }

  /**
   * Search modules with advanced query syntax and filters
   * @param {string} query - Raw query string (supports "phrases", AND, OR, -exclude)
   * @param {Object} options - Search options
   * @param {string} options.year - Academic year (2025, 2026, 2027)
   * @param {number} options.limit - Max results per page
   * @param {number} options.offset - Pagination offset
   * @param {Object} options.filters - Filter criteria
   */
  async searchModules(query, options = {}) {
    const { year = '2027', limit = 20, offset = 0, filters = {} } = options;

    const index = await this.getModuleIndex(year);
    const filePath = path.join(__dirname, `../controllers/module${year}.json`);
    const moduleData = dataCache.get(`module${year}`, filePath);

    if (!moduleData || !moduleData.data) {
      return { results: [], total: 0 };
    }

    // Parse the query for advanced syntax
    const parsedQuery = parseQuery(query);
    const flexSearchQuery = getFlexSearchQuery(parsedQuery);

    // If no search terms, return empty (need at least something to search)
    if (!flexSearchQuery || flexSearchQuery.trim().length === 0) {
      return { results: [], total: 0 };
    }

    // Search across all indexed fields
    const searchResults = index.search(flexSearchQuery, {
      limit: 2000, // Get more results for filtering
      enrich: true
    });

    // Flatten and deduplicate results
    const seenIds = new Set();
    const allMatches = [];

    for (const fieldResult of searchResults) {
      for (const match of fieldResult.result) {
        const id = typeof match === 'object' ? match.id : match;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          const mod = moduleData.data[id];
          if (mod) {
            allMatches.push({ id, mod, field: fieldResult.field });
          }
        }
      }
    }

    // Apply advanced query filtering (exclusions, phrases, AND logic)
    let filteredMatches = allMatches;
    if (parsedQuery.excluded.length > 0 || parsedQuery.phrases.length > 0 ||
        (parsedQuery.operator === 'AND' && parsedQuery.terms.length > 1)) {
      filteredMatches = allMatches.filter(({ mod }) => {
        const content = getModuleContent(mod);
        return matchesQueryCriteria(null, parsedQuery, content);
      });
    }

    // Apply result filters
    if (Object.keys(filters).length > 0) {
      filteredMatches = filteredMatches.filter(({ mod }) => {
        // Filter by schools
        if (filters.schools && filters.schools.length > 0) {
          if (!filters.schools.includes(mod.school)) return false;
        }
        // Filter by colleges (derive from school using mapping)
        if (filters.colleges && filters.colleges.length > 0) {
          const mapping = getSchoolToCollegeMapping();
          const moduleCollege = mapping[mod.school] || '';
          if (!filters.colleges.includes(moduleCollege)) return false;
        }
        // Filter by campus
        if (filters.campuses && filters.campuses.length > 0) {
          if (!filters.campuses.includes(mod.campus)) return false;
        }
        // Filter by level
        if (filters.levels && filters.levels.length > 0) {
          // Level in data is like 'LC', 'LH', 'LM' - extract letter after 'L'
          const levelCode = mod.level && mod.level.length >= 2 ? mod.level[1] : '';
          if (!filters.levels.includes(levelCode)) return false;
        }
        // Filter by credits
        if (filters.credits && filters.credits.length > 0) {
          if (!filters.credits.includes(String(mod.credits))) return false;
        }
        return true;
      });
    }

    // Filter by match fields (which fields the search matched in)
    if (filters.matchFields && filters.matchFields.length > 0) {
      filteredMatches = filteredMatches.filter(({ mod }) => {
        const matches = this.findModuleMatches(mod, query);
        return matches.some(m => filters.matchFields.includes(m.field));
      });
    }

    // Build results with snippets
    const results = [];
    const collegeMapping = getSchoolToCollegeMapping();
    for (let i = offset; i < Math.min(offset + limit, filteredMatches.length); i++) {
      const { mod } = filteredMatches[i];

      // Find matches and generate snippets using original query for highlighting
      const matches = this.findModuleMatches(mod, query);

      results.push({
        type: 'module',
        code: mod.code,
        title: mod.title,
        school: mod.school,
        college: collegeMapping[mod.school] || '',
        dept: mod.dept,
        level: mod.level,
        credits: mod.credits,
        semester: mod.semester,
        campus: mod.campus,
        lead: mod.lead,
        matches: matches
      });
    }

    return {
      results,
      total: filteredMatches.length
    };
  }

  /**
   * Search programmes with advanced query syntax and filters
   * @param {string} query - Raw query string (supports "phrases", AND, OR, -exclude)
   * @param {Object} options - Search options
   * @param {string} options.year - Academic year (2025, 2026, 2027)
   * @param {number} options.limit - Max results per page
   * @param {number} options.offset - Pagination offset
   * @param {Object} options.filters - Filter criteria
   */
  async searchProgrammes(query, options = {}) {
    const { year = '2027', limit = 20, offset = 0, filters = {} } = options;

    const index = await this.getProgrammeIndex(year);
    const filePath = path.join(__dirname, `../controllers/prog${year}.json`);
    const progData = dataCache.get(`prog${year}`, filePath);

    if (!progData || !progData.data) {
      return { results: [], total: 0 };
    }

    // Parse the query for advanced syntax
    const parsedQuery = parseQuery(query);
    const flexSearchQuery = getFlexSearchQuery(parsedQuery);

    // If no search terms, return empty
    if (!flexSearchQuery || flexSearchQuery.trim().length === 0) {
      return { results: [], total: 0 };
    }

    // Search across all indexed fields
    const searchResults = index.search(flexSearchQuery, {
      limit: 2000,
      enrich: true
    });

    // Flatten and deduplicate results
    const seenIds = new Set();
    const allMatches = [];

    for (const fieldResult of searchResults) {
      for (const match of fieldResult.result) {
        const id = typeof match === 'object' ? match.id : match;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          const prog = progData.data[id];
          if (prog) {
            allMatches.push({ id, prog, field: fieldResult.field });
          }
        }
      }
    }

    // Apply advanced query filtering (exclusions, phrases, AND logic)
    let filteredMatches = allMatches;
    if (parsedQuery.excluded.length > 0 || parsedQuery.phrases.length > 0 ||
        (parsedQuery.operator === 'AND' && parsedQuery.terms.length > 1)) {
      filteredMatches = allMatches.filter(({ prog }) => {
        const content = getProgrammeContent(prog);
        return matchesQueryCriteria(null, parsedQuery, content);
      });
    }

    // Apply result filters
    if (Object.keys(filters).length > 0) {
      filteredMatches = filteredMatches.filter(({ prog }) => {
        // Filter by colleges
        if (filters.colleges && filters.colleges.length > 0) {
          if (!filters.colleges.includes(prog.college)) return false;
        }
        // Filter by schools
        if (filters.schools && filters.schools.length > 0) {
          if (!filters.schools.includes(prog.school)) return false;
        }
        // Filter by campus
        if (filters.campuses && filters.campuses.length > 0) {
          if (!filters.campuses.includes(prog.campus)) return false;
        }
        // Filter by mode
        if (filters.modes && filters.modes.length > 0) {
          if (!filters.modes.includes(prog.mode)) return false;
        }
        return true;
      });
    }

    // Filter by match fields (which fields the search matched in)
    if (filters.matchFields && filters.matchFields.length > 0) {
      filteredMatches = filteredMatches.filter(({ prog }) => {
        const matches = this.findProgrammeMatches(prog, query);
        return matches.some(m => filters.matchFields.includes(m.field));
      });
    }

    // Build results with snippets
    const results = [];
    for (let i = offset; i < Math.min(offset + limit, filteredMatches.length); i++) {
      const { prog } = filteredMatches[i];

      // Find matches and generate snippets using original query
      const matches = this.findProgrammeMatches(prog, query);

      results.push({
        type: 'programme',
        progCode: prog.progCode,
        progTitle: prog.progTitle,
        shortTitle: prog.shortTitle,
        longTitle: prog.longTitle,
        longQual: prog.longQual,
        college: prog.college,
        school: prog.school,
        mode: prog.mode,
        campus: prog.campus,
        matches: matches
      });
    }

    return {
      results,
      total: filteredMatches.length
    };
  }

  /**
   * Combined search across modules and programmes with filters
   * @param {string} query - Raw query string (supports "phrases", AND, OR, -exclude)
   * @param {Object} options - Search options including filters and type filter
   */
  async searchAll(query, options = {}) {
    const { year = '2027', limit = 20, offset = 0, filters = {} } = options;

    // Check if type filter limits to one type
    const typeFilter = filters.types || [];
    const searchModules = typeFilter.length === 0 || typeFilter.includes('module');
    const searchProgrammes = typeFilter.length === 0 || typeFilter.includes('programme');

    // Search both in parallel (or just one if type filtered)
    const [moduleResults, programmeResults] = await Promise.all([
      searchModules ? this.searchModules(query, { year, limit: 1000, offset: 0, filters }) : { results: [], total: 0 },
      searchProgrammes ? this.searchProgrammes(query, { year, limit: 1000, offset: 0, filters }) : { results: [], total: 0 }
    ]);

    // Interleave results (alternate between programmes and modules for variety)
    const combined = [];
    let mi = 0, pi = 0;

    while (mi < moduleResults.results.length || pi < programmeResults.results.length) {
      if (pi < programmeResults.results.length) {
        combined.push(programmeResults.results[pi++]);
      }
      if (mi < moduleResults.results.length) {
        combined.push(moduleResults.results[mi++]);
      }
    }

    // Apply pagination
    const paginatedResults = combined.slice(offset, offset + limit);

    return {
      results: paginatedResults,
      total: {
        programmes: programmeResults.total,
        modules: moduleResults.total,
        combined: moduleResults.total + programmeResults.total
      }
    };
  }

  /**
   * Find which fields matched in a module and generate snippets
   */
  findModuleMatches(mod, query) {
    const matches = [];
    const queryLower = query.toLowerCase();
    const snippetLength = 150;

    // Check title
    if (mod.title && mod.title.toLowerCase().includes(queryLower)) {
      matches.push({
        field: 'Title',
        snippet: this.highlightSnippet(mod.title, query)
      });
    }

    // Check code
    if (mod.code && mod.code.toLowerCase().includes(queryLower)) {
      matches.push({
        field: 'Code',
        snippet: this.highlightSnippet(mod.code, query)
      });
    }

    // Check description
    if (Array.isArray(mod.description) && mod.description.length > 0) {
      const descText = mod.description.join(' ');
      if (descText.toLowerCase().includes(queryLower)) {
        matches.push({
          field: 'Description',
          snippet: this.generateSnippet(descText, query, snippetLength)
        });
      }
    }

    // Check outcomes
    if (Array.isArray(mod.outcomes) && mod.outcomes.length > 0) {
      const outcomeText = mod.outcomes.map(o => typeof o === 'object' ? o.outcome : o).join(' ');
      if (outcomeText.toLowerCase().includes(queryLower)) {
        matches.push({
          field: 'Learning Outcomes',
          snippet: this.generateSnippet(outcomeText, query, snippetLength)
        });
      }
    }

    // Check summative
    if (Array.isArray(mod.summative) && mod.summative.length > 0) {
      const summText = mod.summative.join(' ');
      if (summText.toLowerCase().includes(queryLower)) {
        matches.push({
          field: 'Assessment',
          snippet: this.generateSnippet(summText, query, snippetLength)
        });
      }
    }

    // Check school
    if (mod.school && mod.school.toLowerCase().includes(queryLower)) {
      matches.push({
        field: 'School',
        snippet: this.highlightSnippet(mod.school, query)
      });
    }

    // Check lead
    if (mod.lead && mod.lead.toLowerCase().includes(queryLower)) {
      matches.push({
        field: 'Module Lead',
        snippet: this.highlightSnippet(mod.lead, query)
      });
    }

    // Limit to top 3 matches
    return matches.slice(0, 3);
  }

  /**
   * Find which fields matched in a programme and generate snippets
   */
  findProgrammeMatches(prog, query) {
    const matches = [];
    const queryLower = query.toLowerCase();
    const snippetLength = 150;

    // Check title
    if (prog.progTitle && prog.progTitle.toLowerCase().includes(queryLower)) {
      matches.push({
        field: 'Title',
        snippet: this.highlightSnippet(prog.progTitle, query)
      });
    }

    // Check code
    if (prog.progCode && prog.progCode.toLowerCase().includes(queryLower)) {
      matches.push({
        field: 'Code',
        snippet: this.highlightSnippet(prog.progCode, query)
      });
    }

    // Check aims
    if (Array.isArray(prog.aims) && prog.aims.length > 0) {
      const aimsText = prog.aims.join(' ');
      if (aimsText.toLowerCase().includes(queryLower)) {
        matches.push({
          field: 'Programme Aims',
          snippet: this.generateSnippet(aimsText, query, snippetLength)
        });
      }
    }

    // Check knowledge outcomes
    if (prog.knowledge && Array.isArray(prog.knowledge.outcome)) {
      const knowledgeText = prog.knowledge.outcome.join(' ');
      if (knowledgeText.toLowerCase().includes(queryLower)) {
        matches.push({
          field: 'Knowledge Outcomes',
          snippet: this.generateSnippet(knowledgeText, query, snippetLength)
        });
      }
    }

    // Check skills outcomes
    if (prog.skills && Array.isArray(prog.skills.outcome)) {
      const skillsText = prog.skills.outcome.join(' ');
      if (skillsText.toLowerCase().includes(queryLower)) {
        matches.push({
          field: 'Skills Outcomes',
          snippet: this.generateSnippet(skillsText, query, snippetLength)
        });
      }
    }

    // Check college
    if (prog.college && prog.college.toLowerCase().includes(queryLower)) {
      matches.push({
        field: 'College',
        snippet: this.highlightSnippet(prog.college, query)
      });
    }

    // Check school
    if (prog.school && prog.school.toLowerCase().includes(queryLower)) {
      matches.push({
        field: 'School',
        snippet: this.highlightSnippet(prog.school, query)
      });
    }

    // Check subjects
    const subjects = [prog.subject1, prog.subject2, prog.subject3].filter(s => s && s.trim()).join(' ');
    if (subjects.toLowerCase().includes(queryLower)) {
      matches.push({
        field: 'Subject',
        snippet: this.highlightSnippet(subjects, query)
      });
    }

    // Limit to top 3 matches
    return matches.slice(0, 3);
  }

  /**
   * Generate a snippet around the matched text with highlighting
   */
  generateSnippet(text, query, maxLength = 150) {
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();
    const matchIndex = textLower.indexOf(queryLower);

    if (matchIndex === -1) {
      return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
    }

    // Calculate snippet boundaries
    const contextBefore = 50;
    const contextAfter = 80;

    let start = Math.max(0, matchIndex - contextBefore);
    let end = Math.min(text.length, matchIndex + query.length + contextAfter);

    // Adjust to word boundaries
    if (start > 0) {
      const spaceIndex = text.indexOf(' ', start);
      if (spaceIndex !== -1 && spaceIndex < matchIndex) {
        start = spaceIndex + 1;
      }
    }

    if (end < text.length) {
      const spaceIndex = text.lastIndexOf(' ', end);
      if (spaceIndex > matchIndex + query.length) {
        end = spaceIndex;
      }
    }

    let snippet = text.substring(start, end);

    // Add ellipses
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';

    // Highlight the match
    return this.highlightSnippet(snippet, query);
  }

  /**
   * Add HTML highlighting to matched terms
   */
  highlightSnippet(text, query) {
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  /**
   * Pre-warm indexes for all years (call on server startup)
   */
  async prewarmIndexes() {
    const years = ['2025', '2026', '2027'];
    console.log('Pre-warming search indexes...');

    for (const year of years) {
      await this.getModuleIndex(year);
      await this.getProgrammeIndex(year);
    }

    console.log('Search indexes pre-warmed for all years');
  }

  /**
   * Get index statistics
   */
  getStats() {
    return {
      moduleIndexes: Object.keys(this.moduleIndexes),
      programmeIndexes: Object.keys(this.programmeIndexes)
    };
  }
}

// Create singleton instance
const searchIndexManager = new SearchIndexManager();

module.exports = searchIndexManager;
