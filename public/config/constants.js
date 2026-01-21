/**
 * Application Constants
 * Centralized configuration for the University Specification Generator
 */

const CONSTANTS = {
    // Application version
    APP_VERSION: '2.0.0', // Major update with bulk download and onboarding

    // Changelog entries (most recent first)
    CHANGELOG: [
        {
            version: '2.0.0',
            date: '20/11/2025',
            title: 'Bulk Module Downloads & Onboarding',
            features: [
                'Select and download multiple module specifications from programme cards',
                'Download up to 25 modules at once in a ZIP file organized by year',
                'New onboarding system with welcome modal and interactive tours',
                'Enhanced user interface with improved filter pills',
                'Better dark mode support across all components',
                'Editable fields to quickly inform CMT of changes'
            ]
        },
        {
            version: '1.5.0',
            date: '2024-12-01',
            title: 'Modern UI Improvements',
            features: [
                'New modern interface with improved navigation',
                'Programme catalogue with expandable cards',
                'Enhanced search with fuzzy matching',
                'Performance optimizations and bug fixes'
            ]
        }
    ],

    // Academic years
    ACADEMIC_YEARS: ['2025', '2026', '2027'],

    // Spec types
    SPEC_TYPES: {
        COHORT: 'cohort',
        TERM: 'term'
    },

    // Document types
    DOCUMENT_TYPES: {
        SPEC: 'spec',
        SPEC_PLUS: 'spec+',
        WITHDRAWAL: 'wd'
    },

    // Template paths
    TEMPLATE_PATHS: {
        cohort: (year) => `/speccohort${year}.docx`,
        term: (year) => `/specterm${year}.docx`,
        'module-spec': '/module-spec.docx',
        'module-spec+': '/module-spec+.docx',
        'module-wd': '/module-wd.docx'
    },

    // API endpoints
    API_ENDPOINTS: {
        base: '', // Empty string for relative paths on same server
        programmeData: (progCode, cohort, year) => `/prog-data/${progCode}/${cohort}/${year}`,
        moduleData: (modCode, year) => `/mod-data/${modCode}/${year}`,
        autocompleteProgrammes: '/autocomplete-data',
        autocompleteModules: '/mod-autocomplete-data'
    },

    // Storage keys
    STORAGE_KEYS: {
        FAVORITES: 'favorites',
        RECENT_PROGRAMMES: 'recentProgrammes',
        RECENT_MODULES: 'recentModules',
        DARK_MODE: 'darkMode',
        GENERATED_TODAY: 'generatedToday',
        APP_VERSION: 'appVersion',
        ONBOARDING_COMPLETED: 'onboardingCompleted',
        FEATURE_TOURS_COMPLETED: 'featureToursCompleted',
        LAST_SEEN_CHANGELOG: 'lastSeenChangelog'
    },

    // UI Configuration
    UI_CONFIG: {
        MAX_RECENT_ITEMS: 10,
        MAX_AUTOCOMPLETE_RESULTS: 10,
        MIN_SEARCH_LENGTH: 2,
        NOTIFICATION_DURATION: 3000,
        LOADING_DELAY: 100
    },

    // Error messages
    ERROR_MESSAGES: {
        PROGRAMME_NOT_FOUND: 'Programme not found. Please check the code and try again.',
        MODULE_NOT_FOUND: 'Module not found. Please check the code and try again.',
        NETWORK_ERROR: 'Server error. Please try again later.',
        VALIDATION_ERROR: 'Please fill in all required fields',
        STORAGE_QUOTA: 'Storage limit reached. Cleared old history items.',
        TEMPLATE_ERROR: 'Error with document template. Please contact support.',
        GENERIC_ERROR: 'An error occurred. Please try again.',
        LOADING_ERROR: 'Error loading search data. Please refresh the page.'
    },

    // Success messages
    SUCCESS_MESSAGES: {
        SPEC_GENERATED: 'Specification generated successfully!',
        ADDED_TO_FAVORITES: 'Added to favorites!',
        REMOVED_FROM_FAVORITES: 'Removed from favorites'
    },

    // Loading messages
    LOADING_MESSAGES: {
        FETCHING_PROGRAMME: 'Fetching programme data...',
        FETCHING_MODULE: 'Fetching module data...',
        GENERATING_DOCUMENT: 'Generating Word document...',
        LOADING_PREVIEW: 'Loading preview...',
        GENERATING_PREVIEW: 'Generating preview...',
        DEFAULT: 'Generating specification...'
    },

    // Level colors for modules
    LEVEL_COLORS: {
        LC: 'text-yellow-600 dark:text-yellow-400',
        C: 'text-yellow-600 dark:text-yellow-400',
        LI: 'text-blue-600 dark:text-blue-400',
        I: 'text-blue-600 dark:text-blue-400',
        LH: 'text-green-600 dark:text-green-400',
        H: 'text-green-600 dark:text-green-400',
        LM: 'text-red-600 dark:text-red-400',
        M: 'text-red-600 dark:text-red-400'
    }
};

// Onboarding helper functions
const OnboardingManager = {
    /**
     * Check if this is the user's first visit
     */
    isFirstVisit() {
        const version = localStorage.getItem(CONSTANTS.STORAGE_KEYS.APP_VERSION);
        return !version;
    },

    /**
     * Check if user has seen the current version
     */
    hasSeenCurrentVersion() {
        const savedVersion = localStorage.getItem(CONSTANTS.STORAGE_KEYS.APP_VERSION);
        return savedVersion === CONSTANTS.APP_VERSION;
    },

    /**
     * Check if onboarding was completed
     */
    isOnboardingCompleted() {
        return localStorage.getItem(CONSTANTS.STORAGE_KEYS.ONBOARDING_COMPLETED) === 'true';
    },

    /**
     * Mark onboarding as completed
     */
    completeOnboarding() {
        localStorage.setItem(CONSTANTS.STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
        localStorage.setItem(CONSTANTS.STORAGE_KEYS.APP_VERSION, CONSTANTS.APP_VERSION);
    },

    /**
     * Check if a specific feature tour was completed
     */
    isTourCompleted(tourName) {
        try {
            const tours = JSON.parse(localStorage.getItem(CONSTANTS.STORAGE_KEYS.FEATURE_TOURS_COMPLETED) || '{}');
            return tours[tourName] === true;
        } catch (e) {
            return false;
        }
    },

    /**
     * Mark a feature tour as completed
     */
    completeTour(tourName) {
        try {
            const tours = JSON.parse(localStorage.getItem(CONSTANTS.STORAGE_KEYS.FEATURE_TOURS_COMPLETED) || '{}');
            tours[tourName] = true;
            localStorage.setItem(CONSTANTS.STORAGE_KEYS.FEATURE_TOURS_COMPLETED, JSON.stringify(tours));
        } catch (e) {
            console.error('Error saving tour completion:', e);
        }
    },

    /**
     * Get the last seen changelog version
     */
    getLastSeenChangelog() {
        return localStorage.getItem(CONSTANTS.STORAGE_KEYS.LAST_SEEN_CHANGELOG);
    },

    /**
     * Mark current changelog as seen
     */
    markChangelogAsSeen() {
        localStorage.setItem(CONSTANTS.STORAGE_KEYS.LAST_SEEN_CHANGELOG, CONSTANTS.APP_VERSION);
    },

    /**
     * Check if there are new features since last visit
     */
    hasNewFeatures() {
        const lastSeen = this.getLastSeenChangelog();
        return !lastSeen || lastSeen !== CONSTANTS.APP_VERSION;
    },

    /**
     * Reset all onboarding state (for testing)
     */
    reset() {
        localStorage.removeItem(CONSTANTS.STORAGE_KEYS.APP_VERSION);
        localStorage.removeItem(CONSTANTS.STORAGE_KEYS.ONBOARDING_COMPLETED);
        localStorage.removeItem(CONSTANTS.STORAGE_KEYS.FEATURE_TOURS_COMPLETED);
        localStorage.removeItem(CONSTANTS.STORAGE_KEYS.LAST_SEEN_CHANGELOG);
    }
};

// Make constants and onboarding manager available globally
window.CONSTANTS = CONSTANTS;
window.OnboardingManager = OnboardingManager;
