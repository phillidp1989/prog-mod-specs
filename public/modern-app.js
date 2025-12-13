// Modern App JavaScript
// Debug flag - set to true for development logging
window.DEBUG = false;

if (window.DEBUG) console.log('🚀 modern-app.js loading...');
let progAutocompleteData = {};
let modAutocompleteData = {};
let progFuse = null; // Fuse instance for programmes
let modFuse = null; // Fuse instance for modules
let recentProgrammes = [];
let recentModules = [];

// Load recent items from localStorage with error handling
try {
    const recentProgsData = localStorage.getItem(CONSTANTS.STORAGE_KEYS.RECENT_PROGRAMMES);
    const recentModsData = localStorage.getItem(CONSTANTS.STORAGE_KEYS.RECENT_MODULES);

    if (recentProgsData) {
        recentProgrammes = JSON.parse(recentProgsData);
    }
    if (recentModsData) {
        recentModules = JSON.parse(recentModsData);
    }
} catch (error) {
    console.error('Error loading recent items from localStorage:', error);
    recentProgrammes = [];
    recentModules = [];
}

// Initialize autocomplete data
async function initializeAutocomplete() {
    console.log('🔧 initializeAutocomplete called');
    try {
        // Set loading placeholders
        const progInput = document.getElementById('prog-search');
        const modInput = document.getElementById('mod-search');

        if (progInput) {
            progInput.placeholder = 'Loading programme data...';
        }
        if (modInput) {
            modInput.placeholder = 'Loading module data...';
        }
        console.log('📝 Loading placeholders set');

        // Load programme autocomplete data
        const progResponse = await axios.get(CONSTANTS.API_ENDPOINTS.autocompleteProgrammes);
        progAutocompleteData = progResponse.data;

        // Remove skeleton and enable input
        const progSkeleton = document.getElementById('prog-search-skeleton');
        if (progSkeleton) {
            progSkeleton.remove();
        }
        if (progInput) {
            progInput.disabled = false;
            progInput.placeholder = 'Enter programme code or title...';
        }
        console.log('✓ Programme data loaded');

        // Create Fuse instance for programmes
        const progDataList = Object.keys(progAutocompleteData).map(key => ({ value: key }));
        progFuse = new Fuse(progDataList, {
            keys: ['value'],
            threshold: 0.3,
            distance: 100,
            includeScore: true,
            includeMatches: true,
            minMatchCharLength: 2
        });

        // Setup programme autocomplete
        setupAutocomplete('prog-search', progAutocompleteData, progFuse);

        // Load module autocomplete data
        const modResponse = await axios.get(CONSTANTS.API_ENDPOINTS.autocompleteModules);
        modAutocompleteData = modResponse.data;

        // Remove skeleton and enable input
        const modSkeleton = document.getElementById('mod-search-skeleton');
        if (modSkeleton) {
            modSkeleton.remove();
        }
        if (modInput) {
            modInput.disabled = false;
            modInput.placeholder = 'Enter module code or title...';
        }
        console.log('✓ Module data loaded');

        // Create Fuse instance for modules
        const modDataList = Object.keys(modAutocompleteData).map(key => ({ value: key }));
        modFuse = new Fuse(modDataList, {
            keys: ['value'],
            threshold: 0.3,
            distance: 100,
            includeScore: true,
            includeMatches: true,
            minMatchCharLength: 2
        });

        // Setup module autocomplete
        setupAutocomplete('mod-search', modAutocompleteData, modFuse);
    } catch (error) {
        console.error('Error loading autocomplete data:', error);

        // Show error state in inputs
        const progSkeleton = document.getElementById('prog-search-skeleton');
        const modSkeleton = document.getElementById('mod-search-skeleton');

        if (progSkeleton) {
            progSkeleton.innerHTML = '<div class="flex items-center text-red-600 dark:text-red-400 text-sm"><i data-lucide="alert-circle" class="w-4 h-4 mr-2"></i>Failed to load</div>';
            lucide.createIcons();
        }
        if (modSkeleton) {
            modSkeleton.innerHTML = '<div class="flex items-center text-red-600 dark:text-red-400 text-sm"><i data-lucide="alert-circle" class="w-4 h-4 mr-2"></i>Failed to load</div>';
            lucide.createIcons();
        }

        showNotification(CONSTANTS.ERROR_MESSAGES.LOADING_ERROR, 'error');
    }
}

// Setup autocomplete functionality
function setupAutocomplete(inputId, data, fuseInstance) {
    const input = document.getElementById(inputId);
    const dataList = Object.keys(data);
    let currentFocusIndex = -1;
    let filteredItems = [];

    // Create dropdown container
    const dropdown = document.createElement('div');
    dropdown.className = 'absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg mt-1 max-h-60 overflow-auto hidden';
    dropdown.id = `${inputId}-dropdown`;
    dropdown.setAttribute('role', 'listbox');
    input.parentElement.appendChild(dropdown);

    // Helper function to highlight option
    function highlightOption(index) {
        const options = dropdown.querySelectorAll('[role="option"]');
        options.forEach((opt, i) => {
            if (i === index) {
                opt.classList.add('bg-gray-100', 'dark:bg-gray-700');
                opt.setAttribute('aria-selected', 'true');
                // Scroll into view if needed
                opt.scrollIntoView({ block: 'nearest' });
            } else {
                opt.classList.remove('bg-gray-100', 'dark:bg-gray-700');
                opt.setAttribute('aria-selected', 'false');
            }
        });
    }

    // Input event listener with fuzzy search
    input.addEventListener('input', (e) => {
        const value = e.target.value;
        currentFocusIndex = -1;

        if (value.length < 2) {
            dropdown.classList.add('hidden');
            input.setAttribute('aria-expanded', 'false');
            return;
        }

        // Apply filters before search
        let searchData = dataList;
        const filterType = inputId === 'mod-search' ? 'modules' : 'programmes';

        if (window.applyFiltersToData) {
            searchData = window.applyFiltersToData(dataList, filterType);
        }

        // Create temporary Fuse instance with filtered data
        const tempFuse = new Fuse(
            searchData.map(key => ({ value: key })),
            fuseInstance.options
        );

        // Use Fuse.js for fuzzy search on filtered data
        const results = tempFuse.search(value);

        // Prioritize exact code matches
        // Check if the search value matches a code exactly (codes are at the start of each item)
        const searchValueUpper = value.toUpperCase().trim();
        const exactMatchIndex = results.findIndex(result => {
            const item = result.item.value;
            // Extract code (everything before " - ")
            const code = item.split(' - ')[0].trim();
            return code === searchValueUpper;
        });

        // If exact match found and it's not already first, move it to the top
        if (exactMatchIndex > 0) {
            const [exactMatch] = results.splice(exactMatchIndex, 1);
            results.unshift(exactMatch);
        }

        // Extract the matched items and limit to 10
        filteredItems = results.slice(0, 10).map(result => result.item.value);

        // Show empty state if no results
        if (filteredItems.length === 0) {
            dropdown.innerHTML = `
                <div class="px-4 py-8 text-center">
                    <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 mb-3">
                        <i data-lucide="search-x" class="w-6 h-6 text-gray-400 dark:text-gray-500"></i>
                    </div>
                    <p class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">No results found</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Try adjusting your search or filters</p>
                </div>
            `;
            lucide.createIcons();
            dropdown.classList.remove('hidden');
            input.setAttribute('aria-expanded', 'true');
            return;
        }

        // Generate dropdown HTML with fuzzy match highlighting
        const optionsHTML = results.slice(0, 10).map((result, index) => {
            const item = result.item.value;
            const matches = result.matches && result.matches.length > 0 ? result.matches[0].indices : [];

            // Parse the programme string: "CODE - Title Mode (Campus) [School] {College}"
            const parseMatch = item.match(/^([A-Z0-9]+)\s+-\s+(.+?)\s+([A-Z]{2})\s+\((.+?)\)(?:\s+\[(.+?)\])?(?:\s+\{(.+?)\})?$/);

            let displayHTML;
            if (parseMatch) {
                const [, code, title, mode, campus, school, college] = parseMatch;

                // Get college colors and abbreviation
                const collegeColors = college ? window.getCollegeColor(college) : null;
                const collegeAbbr = college ? window.abbreviateCollege(college) : null;

                // Build main programme line with fuzzy highlighting
                const mainText = `${code} - ${title} ${mode} (${campus})`;
                const mainMatches = result.matches && result.matches.length > 0 ?
                    result.matches[0].indices.filter(([start]) => start < mainText.length) : [];
                const highlightedMain = highlightFuzzyMatches(mainText, mainMatches);

                // Build metadata line
                let metadataHTML = '';
                if (school || college) {
                    metadataHTML = '<div class="flex items-center gap-2 mt-1">';

                    if (school) {
                        metadataHTML += `<span class="text-xs text-gray-600 dark:text-gray-400">${school}</span>`;
                    }

                    if (school && college) {
                        metadataHTML += '<span class="text-xs text-gray-400 dark:text-gray-500">•</span>';
                    }

                    if (college && collegeColors && collegeAbbr) {
                        metadataHTML += `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${collegeColors.bg} ${collegeColors.text} ${collegeColors.darkBg} ${collegeColors.darkText}">${collegeAbbr}</span>`;
                    }

                    metadataHTML += '</div>';
                }

                displayHTML = `
                    <div class="leading-relaxed">
                        <div>${highlightedMain}</div>
                        ${metadataHTML}
                    </div>
                `;
            } else {
                // Fallback to original display if parsing fails
                const highlightedText = highlightFuzzyMatches(item, matches);
                displayHTML = highlightedText;
            }

            return `
                <div class="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-900 dark:text-gray-100"
                     role="option"
                     aria-selected="false"
                     id="${inputId}-option-${index}"
                     onclick="selectAutocomplete('${inputId}', '${item.replace(/'/g, "\\'")}')"
                     onmouseenter="this.classList.add('bg-gray-100', 'dark:bg-gray-700')"
                     onmouseleave="if(!this.getAttribute('aria-selected') || this.getAttribute('aria-selected') === 'false') { this.classList.remove('bg-gray-100', 'dark:bg-gray-700') }">
                    ${displayHTML}
                </div>
            `;
        }).join('');

        // Add keyboard shortcut hints footer
        const keyboardHintsHTML = `
            <div class="px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-3">
                <span><kbd class="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">↑↓</kbd> navigate</span>
                <span><kbd class="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Enter</kbd> select</span>
                <span><kbd class="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Esc</kbd> close</span>
            </div>
        `;

        dropdown.innerHTML = optionsHTML + keyboardHintsHTML;

        dropdown.classList.remove('hidden');
        input.setAttribute('aria-expanded', 'true');
    });

    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
        const options = dropdown.querySelectorAll('[role="option"]');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (options.length > 0) {
                currentFocusIndex = (currentFocusIndex + 1) % options.length;
                highlightOption(currentFocusIndex);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (options.length > 0) {
                currentFocusIndex = currentFocusIndex <= 0 ? options.length - 1 : currentFocusIndex - 1;
                highlightOption(currentFocusIndex);
            }
        } else if (e.key === 'Enter') {
            if (currentFocusIndex >= 0 && filteredItems[currentFocusIndex]) {
                e.preventDefault();
                selectAutocomplete(inputId, filteredItems[currentFocusIndex]);
            }
        } else if (e.key === 'Escape') {
            dropdown.classList.add('hidden');
            input.setAttribute('aria-expanded', 'false');
            currentFocusIndex = -1;
        }
    });

    // Hide dropdown on click outside
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
            input.setAttribute('aria-expanded', 'false');
            currentFocusIndex = -1;
        }
    });
}

// Escape HTML special characters to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Highlight fuzzy matched characters using Fuse.js match indices
function highlightFuzzyMatches(text, matchIndices) {
    if (!matchIndices || matchIndices.length === 0) {
        return escapeHtml(text);
    }

    let result = '';
    let lastIndex = 0;

    // Sort and merge overlapping indices
    const sortedIndices = matchIndices.sort((a, b) => a[0] - b[0]);

    sortedIndices.forEach(([start, end]) => {
        // Add non-matched text before this match
        if (start > lastIndex) {
            result += escapeHtml(text.substring(lastIndex, start));
        }

        // Add matched text with highlighting
        result += '<span class="font-semibold text-primary-600 dark:text-primary-400">';
        result += escapeHtml(text.substring(start, end + 1));
        result += '</span>';

        lastIndex = end + 1;
    });

    // Add remaining non-matched text
    if (lastIndex < text.length) {
        result += escapeHtml(text.substring(lastIndex));
    }

    return result;
}

// Select autocomplete item
function selectAutocomplete(inputId, value) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(`${inputId}-dropdown`);

    input.value = value;
    dropdown.classList.add('hidden');
    input.setAttribute('aria-expanded', 'false');

    // Trigger change event for other listeners
    input.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Attach all event listeners to buttons
 * MUST be called after DOM is loaded
 */
function attachEventListeners() {
// Programme generate handler
document.getElementById('prog-generate-btn').addEventListener('click', async () => {
    // Validate form before proceeding
    if (!validateProgrammeForm()) {
        return;
    }

    const searchValue = document.getElementById('prog-search').value;
    const cohort = document.getElementById('cohort-select').value;
    const year = document.getElementById('year-select').value;

    const progCode = searchValue.split(' - ')[0];

    setButtonLoading('prog-generate-btn', true);
    showLoading(true, 'Fetching programme data...', {
        showProgress: true,
        detailedStatus: 'Connecting to server...'
    });
    updateLoadingProgress(10, 'Requesting programme information');

    try {
        // Use AbortController signal for cancellation
        const response = await axios.get(`/prog-data/${progCode}/${cohort}/${year}`, {
            signal: currentAbortController?.signal
        });

        updateLoadingProgress(40, 'Programme data received');
        const data = response.data;

        if (!data) {
            showNotification('Programme not found. Please check the code and try again.', 'error');
            setButtonLoading('prog-generate-btn', false);
            showLoading(false);
            return;
        }

        updateLoadingProgress(50, 'Processing programme information');

        // Add to recent programmes with error handling
        try {
            addToRecent('programmes', {
                code: progCode,
                title: data.progTitle,
                cohort: cohort,
                year: year,
                timestamp: new Date().toISOString()
            });
        } catch (storageError) {
            console.warn('Could not save to recent items:', storageError);
        }

        // Generate document
        updateLoadingProgress(60, 'Loading document template...');
        showLoading(true, 'Generating Word document...', {
            showProgress: true,
            detailedStatus: 'Preparing document structure...'
        });

        updateLoadingProgress(70, 'Filling in programme details...');
        await generateProgrammeDoc(data, cohort, year);

        updateLoadingProgress(90, 'Finalizing document...');

        // Track generation
        trackGenerated('programme', progCode);

        updateLoadingProgress(100, 'Complete!');

        // Small delay to show completion
        await new Promise(resolve => setTimeout(resolve, 300));

        setButtonLoading('prog-generate-btn', false);
        showLoading(false);
        showNotification('Specification generated successfully!', 'success');
    } catch (error) {
        console.error('Error generating specification:', error);

        // Check if it was a cancellation
        if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
            // Already handled by cancelCurrentOperation
            return;
        }

        let errorMessage = 'Error generating specification. Please try again.';

        if (!error.response) {
            // Network error (no response from server)
            errorMessage = 'Network error. Please check your connection and try again.';
        } else {
            // Server responded with an error
            switch (error.response.status) {
                case 400:
                    errorMessage = error.response.data?.error || 'Invalid programme code format. Please check your input.';
                    break;
                case 404:
                    errorMessage = 'Programme not found in database. Please verify the code, cohort type, and year.';
                    break;
                case 429:
                    errorMessage = 'Too many requests. Please wait a moment and try again.';
                    break;
                case 500:
                    errorMessage = 'Server error. Please try again later.';
                    break;
                default:
                    errorMessage = error.response.data?.error || 'Error generating specification. Please try again.';
            }
        }

        showNotification(errorMessage, 'error');
        setButtonLoading('prog-generate-btn', false);
        showLoading(false);
    }
});

// Programme preview handler
document.getElementById('prog-preview-btn').addEventListener('click', async () => {
    // Validate form before proceeding
    if (!validateProgrammeForm()) {
        return;
    }

    const searchValue = document.getElementById('prog-search').value;
    const cohort = document.getElementById('cohort-select').value;
    const year = document.getElementById('year-select').value;

    const progCode = searchValue.split(' - ')[0];

    setButtonLoading('prog-preview-btn', true);
    showLoading(true, 'Loading programme data...', {
        showProgress: true,
        detailedStatus: 'Connecting to server...'
    });
    updateLoadingProgress(20, 'Fetching programme information');

    try {
        const response = await axios.get(`/prog-data/${progCode}/${cohort}/${year}`, {
            signal: currentAbortController?.signal
        });

        updateLoadingProgress(60, 'Programme data received');
        const data = response.data;

        if (!data) {
            showNotification('Programme not found. Please check the code and try again.', 'error');
            setButtonLoading('prog-preview-btn', false);
            showLoading(false);
            return;
        }

        // Store data for download from preview
        currentPreviewData = data;
        currentPreviewType = 'programme';
        currentPreviewYear = year;
        currentPreviewCohort = cohort;

        // Generate preview HTML
        updateLoadingProgress(80, 'Generating preview...');
        const previewHtml = generateProgrammePreview(data, cohort, year);

        updateLoadingProgress(100, 'Opening preview...');
        await new Promise(resolve => setTimeout(resolve, 200));

        openPreview(previewHtml);

        setButtonLoading('prog-preview-btn', false);
        showLoading(false);
    } catch (error) {
        console.error('Error loading preview:', error);

        // Check if it was a cancellation
        if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
            return;
        }

        const errorMessage = error.response?.status === 404
            ? 'Programme not found in database'
            : error.response?.status === 500
            ? 'Server error. Please try again later.'
            : 'Error loading preview. Please try again.';
        showNotification(errorMessage, 'error');
        setButtonLoading('prog-preview-btn', false);
        showLoading(false);
    }
});

// Module generate handler
document.getElementById('mod-generate-btn').addEventListener('click', async () => {
    // Validate form before proceeding
    if (!validateModuleForm()) {
        return;
    }

    const searchValue = document.getElementById('mod-search').value;
    const year = document.getElementById('mod-year-select').value;
    const docType = document.getElementById('mod-type-select').value;

    const modCode = searchValue.substr(0, 5);

    setButtonLoading('mod-generate-btn', true);
    showLoading(true, 'Fetching module data...', {
        showProgress: true,
        detailedStatus: 'Connecting to server...'
    });
    updateLoadingProgress(10, 'Requesting module information');

    try {
        const response = await axios.get(`/mod-data/${modCode}/${year}`, {
            signal: currentAbortController?.signal
        });

        updateLoadingProgress(40, 'Module data received');
        const data = response.data;

        if (!data) {
            showNotification('Module not found. Please check the code and try again.', 'error');
            setButtonLoading('mod-generate-btn', false);
            showLoading(false);
            return;
        }

        updateLoadingProgress(50, 'Processing module information');

        // Add to recent modules with error handling
        try {
            addToRecent('modules', {
                code: modCode,
                title: data.title,
                year: year,
                credits: data.credits,
                level: data.level,
                timestamp: new Date().toISOString()
            });
        } catch (storageError) {
            console.warn('Could not save to recent items:', storageError);
        }

        // Generate document
        updateLoadingProgress(60, 'Loading document template...');
        showLoading(true, 'Generating Word document...', {
            showProgress: true,
            detailedStatus: 'Preparing document structure...'
        });

        updateLoadingProgress(70, 'Filling in module details...');
        await generateModuleDoc(data, year, docType);

        updateLoadingProgress(90, 'Finalizing document...');

        // Track generation
        trackGenerated('module', modCode);

        updateLoadingProgress(100, 'Complete!');
        await new Promise(resolve => setTimeout(resolve, 300));

        setButtonLoading('mod-generate-btn', false);
        showLoading(false);
        showNotification('Specification generated successfully!', 'success');
    } catch (error) {
        console.error('Error generating specification:', error);

        // Check if it was a cancellation
        if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
            return;
        }

        let errorMessage = 'Error generating specification. Please try again.';

        if (!error.response) {
            // Network error (no response from server)
            errorMessage = 'Network error. Please check your connection and try again.';
        } else {
            // Server responded with an error
            switch (error.response.status) {
                case 400:
                    errorMessage = error.response.data?.error || 'Invalid module code format. Please check your input.';
                    break;
                case 404:
                    errorMessage = 'Module not found in database. Please verify the module code and year.';
                    break;
                case 429:
                    errorMessage = 'Too many requests. Please wait a moment and try again.';
                    break;
                case 500:
                    errorMessage = 'Server error. Please try again later.';
                    break;
                default:
                    errorMessage = error.response.data?.error || 'Error generating specification. Please try again.';
            }
        }

        showNotification(errorMessage, 'error');
        setButtonLoading('mod-generate-btn', false);
        showLoading(false);
    }
});

// Module preview handler
document.getElementById('mod-preview-btn').addEventListener('click', async () => {
    // Validate form before proceeding
    if (!validateModuleForm()) {
        return;
    }

    const searchValue = document.getElementById('mod-search').value;
    const year = document.getElementById('mod-year-select').value;

    const modCode = searchValue.substr(0, 5);

    setButtonLoading('mod-preview-btn', true);
    showLoading(true, 'Loading module data...', {
        showProgress: true,
        detailedStatus: 'Connecting to server...'
    });
    updateLoadingProgress(20, 'Fetching module information');

    try {
        const response = await axios.get(`/mod-data/${modCode}/${year}`, {
            signal: currentAbortController?.signal
        });

        updateLoadingProgress(60, 'Module data received');
        const data = response.data;

        if (!data) {
            showNotification('Module not found. Please check the code and try again.', 'error');
            setButtonLoading('mod-preview-btn', false);
            showLoading(false);
            return;
        }

        // Store data for download from preview
        currentPreviewData = data;
        currentPreviewType = 'module';
        currentPreviewYear = year;
        currentPreviewDocType = document.getElementById('mod-type-select').value;

        // Generate preview HTML
        updateLoadingProgress(80, 'Generating preview...');
        const previewHtml = generateModulePreview(data, year);

        updateLoadingProgress(100, 'Opening preview...');
        await new Promise(resolve => setTimeout(resolve, 200));

        openPreview(previewHtml);

        setButtonLoading('mod-preview-btn', false);
        showLoading(false);
    } catch (error) {
        console.error('Error loading preview:', error);

        // Check if it was a cancellation
        if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
            return;
        }

        const errorMessage = error.response?.status === 404
            ? 'Module not found in database'
            : error.response?.status === 500
            ? 'Server error. Please try again later.'
            : 'Error loading preview. Please try again.';
        showNotification(errorMessage, 'error');
        setButtonLoading('mod-preview-btn', false);
        showLoading(false);
    }
});

// Helper functions for learning outcomes card separation

/**
 * Detect if text starts with numbering pattern
 * Patterns: "1.", "2)", "(1)", "A.", "a)", etc.
 */
function detectNumbering(text) {
    if (!text) return false;
    const trimmed = text.trim();
    // Match patterns: 1., 1), (1), (1.), A., a), (A), etc.
    const patterns = [
        /^\d+\./,           // 1., 2., 3.
        /^\d+\)/,           // 1), 2), 3)
        /^\(\d+\)/,         // (1), (2), (3)
        /^\(\d+\)\./,       // (1)., (2)., (3).
        /^[A-Z]\./,         // A., B., C.
        /^[a-z]\./,         // a., b., c.
        /^[A-Z]\)/,         // A), B), C)
        /^[a-z]\)/,         // a), b), c)
        /^\([A-Z]\)/,       // (A), (B), (C)
        /^\([a-z]\)/,       // (a), (b), (c)
    ];
    return patterns.some(pattern => pattern.test(trimmed));
}

/**
 * Strip numbering from start of text
 */
function stripNumbering(text) {
    if (!text) return text;
    const trimmed = text.trim();
    // Remove patterns and any trailing whitespace
    return trimmed.replace(/^(\d+\.|\d+\)|\(\d+\)|\(\d+\)\.|[A-Za-z]\.|\([A-Za-z]\)|[A-Za-z]\))\s*/, '').trim();
}

/**
 * Render circular number badge
 */
function renderNumberBadge(number, color = 'blue') {
    const colorMap = {
        blue: 'bg-blue-600 dark:bg-blue-500',
        green: 'bg-green-600 dark:bg-green-500',
        purple: 'bg-purple-600 dark:bg-purple-500'
    };
    const bgColor = colorMap[color] || colorMap.blue;

    return `<span class="flex-shrink-0 w-7 h-7 ${bgColor} text-white rounded-full flex items-center justify-center text-sm font-semibold">${number}</span>`;
}

/**
 * Deduplicate modules by moduleCode
 * Returns array with only unique modules (first occurrence preserved)
 * @param {Array} modules - Array of module objects
 * @returns {Array} - Deduplicated array of modules
 */
function deduplicateModules(modules) {
    if (!modules || !Array.isArray(modules)) return [];

    const seen = new Set();
    return modules.filter(mod => {
        if (!mod || !mod.moduleCode) return false;

        if (seen.has(mod.moduleCode)) {
            return false; // Skip duplicate
        }

        seen.add(mod.moduleCode);
        return true; // Keep first occurrence
    });
}

// Generate programme preview HTML
window.generateProgrammePreview = function(data, cohort, year) {
    const progCode = data.progCode;
    const inModuleSelectionMode = catalogueState.moduleSelectionMode && catalogueState.moduleSelectionProgrammeCode === progCode;

    // Helper function to render module table
    const renderModuleTable = (modules, title) => {
        if (!modules || modules.length === 0) return '';

        // Deduplicate modules before rendering
        const uniqueModules = deduplicateModules(modules);

        return `
            <div class="mb-4">
                <h5 class="font-medium text-gray-800 dark:text-gray-200 mb-3">${title}</h5>
                <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead class="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-700">
                            <tr>
                                ${inModuleSelectionMode ? '<th class="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-12">Select</th>' : ''}
                                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Code</th>
                                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Title</th>
                                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Credits</th>
                                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Level</th>
                                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Semester</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white dark:bg-gray-900">
                            ${uniqueModules.map((mod, index) => {
                                const moduleKey = `${mod.moduleCode}_${year}`;
                                const isSelected = inModuleSelectionMode && catalogueState.selectedModulesFromProgramme.has(moduleKey);
                                return `
                                <tr class="${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'} ${isSelected ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20' : ''} hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                                    ${inModuleSelectionMode ? `
                                    <td class="px-4 py-3 text-center">
                                        <input type="checkbox"
                                               ${isSelected ? 'checked' : ''}
                                               onchange="window.toggleModuleSelection('${mod.moduleCode}', '${year}', '${progCode}', '${(mod.moduleTitle || '').replace(/'/g, "\\'")}', '${mod.moduleCredits || ''}', '${mod.moduleLevel || ''}', '${mod.moduleSemester || ''}', this.checked)"
                                               class="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer">
                                    </td>
                                    ` : ''}
                                    <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">${mod.moduleCode || ''}</td>
                                    <td class="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">${mod.moduleTitle || ''}</td>
                                    <td class="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-900 dark:text-gray-100">${mod.moduleCredits || ''}</td>
                                    <td class="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-900 dark:text-gray-100">${mod.moduleLevel || ''}</td>
                                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${mod.moduleSemester || ''}</td>
                                </tr>
                            `}).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    };

    // Helper function to render a module row
    const renderModuleRow = (mod, index, yearNum) => {
        const moduleKey = `${mod.moduleCode}_${year}`;
        const isSelected = inModuleSelectionMode && catalogueState.selectedModulesFromProgramme.has(moduleKey);
        const rowClass = (index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50') + (isSelected ? ' ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20' : '') + ' hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors';
        const safeTitle = (mod.moduleTitle || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

        let row = `<tr class="${rowClass}">`;

        if (inModuleSelectionMode) {
            row += `
                <td class="px-4 py-3 text-center">
                    <input type="checkbox"
                           ${isSelected ? 'checked' : ''}
                           onchange="window.toggleModuleSelection('${mod.moduleCode}', '${year}', '${progCode}', '${safeTitle}', '${mod.moduleCredits || ''}', '${mod.moduleLevel || ''}', '${mod.moduleSemester || ''}', ${yearNum}, this.checked)"
                           class="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer">
                </td>`;
        }

        row += `
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">${mod.moduleCode || ''}</td>
            <td class="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">${mod.moduleTitle || ''}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-900 dark:text-gray-100">${mod.moduleCredits || ''}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-900 dark:text-gray-100">${mod.moduleLevel || ''}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${mod.moduleSemester || ''}</td>
        </tr>`;

        return row;
    };

    // Helper function to render year section
    const renderYearSection = (yearData, yearNum, exists) => {
        if (!exists || !yearData) return '';

        const hasCompulsory = yearData.rules && yearData.rules.compulsory && yearData.rules.compulsory.length > 0;
        const hasOptional = yearData.rules && yearData.rules.optional && yearData.rules.optional.length > 0;

        // Calculate total modules and compulsory credits only
        let totalModules = 0;
        let compulsoryCredits = 0;

        if (hasCompulsory) {
            yearData.rules.compulsory.forEach(rule => {
                if (rule.module) {
                    // Deduplicate modules before counting
                    const uniqueModules = deduplicateModules(rule.module);
                    totalModules += uniqueModules.length;
                    uniqueModules.forEach(mod => {
                        compulsoryCredits += parseInt(mod.moduleCredits) || 0;
                    });
                }
            });
        }

        if (hasOptional) {
            yearData.rules.optional.forEach(rule => {
                if (rule.module) {
                    // Deduplicate modules before counting
                    const uniqueModules = deduplicateModules(rule.module);
                    totalModules += uniqueModules.length;
                    // Note: Not adding optional credits to avoid inflated totals
                }
            });
        }

        return `
            <div class="border-l-4 border-l-purple-500 dark:border-l-purple-400 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <button onclick="toggleSection('year${yearNum}', event)" class="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-transparent dark:from-purple-900/20 dark:to-transparent hover:from-purple-100 dark:hover:from-purple-900/30 flex items-center justify-between transition-colors group">
                    <div class="flex items-center space-x-3">
                        <i data-lucide="chevron-right" class="w-5 h-5 text-purple-600 dark:text-purple-400 transform transition-transform" id="year${yearNum}-icon"></i>
                        <div class="flex items-center gap-3">
                            <span class="font-semibold text-gray-900 dark:text-gray-100">Year ${yearNum}</span>
                            <div class="flex gap-2">
                                <span class="text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-medium">
                                    ${totalModules} module${totalModules !== 1 ? 's' : ''}
                                </span>
                                ${compulsoryCredits > 0 ? `<span class="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-medium">
                                    ${compulsoryCredits} compulsory credit${compulsoryCredits !== 1 ? 's' : ''}
                                </span>` : ''}
                            </div>
                        </div>
                    </div>
                    <span class="text-xs text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">Click to expand</span>
                </button>
                <div id="year${yearNum}-content" class="hidden p-4 bg-white dark:bg-gray-900">
                    ${yearData.yearText ? `<p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">${yearData.yearText}</p>` : ''}
                    
                    ${hasCompulsory ? `
                        <div class="mb-6">
                            <h5 class="font-semibold text-gray-800 dark:text-gray-200 mb-3">Compulsory Modules</h5>
                            ${yearData.rules.compulsory.map(rule => `
                                ${rule.ruleText ? `<p class="text-sm text-gray-700 dark:text-gray-300 mb-2 italic">${rule.ruleText}</p>` : ''}
                                ${rule.module && rule.module.length > 0 ? `
                                    <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
                                        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead class="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-700">
                                                <tr>
                                                    ${inModuleSelectionMode ? '<th class="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-12">Select</th>' : ''}
                                                    <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Code</th>
                                                    <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Title</th>
                                                    <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Credits</th>
                                                    <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Level</th>
                                                    <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Semester</th>
                                                </tr>
                                            </thead>
                                            <tbody class="bg-white dark:bg-gray-900">
                                                <tbody class="bg-white dark:bg-gray-900">
                                                    ${deduplicateModules(rule.module).map((mod, index) => renderModuleRow(mod, index, yearNum)).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                ` : ''}
                            `).join('')}
                        </div>
                    ` : ''}

                    ${hasOptional ? `
                        <div>
                            <h5 class="font-semibold text-gray-800 dark:text-gray-200 mb-3">Optional Modules</h5>
                            ${yearData.rules.optional.map(rule => `
                                ${rule.ruleText ? `<p class="text-sm text-gray-700 dark:text-gray-300 mb-2 italic">${rule.ruleText}</p>` : ''}
                                ${rule.module && rule.module.length > 0 ? `
                                    <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
                                        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead class="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-700">
                                                <tr>
                                                    ${inModuleSelectionMode ? '<th class="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-12">Select</th>' : ''}
                                                    <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Code</th>
                                                    <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Title</th>
                                                    <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Credits</th>
                                                    <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Level</th>
                                                    <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Semester</th>
                                                </tr>
                                            </thead>
                                            <tbody class="bg-white dark:bg-gray-900">
                                                <tbody class="bg-white dark:bg-gray-900">
                                                    ${deduplicateModules(rule.module).map((mod, index) => renderModuleRow(mod, index, yearNum)).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                ` : ''}
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    ${!hasCompulsory && !hasOptional ? '<p class="text-gray-500 dark:text-gray-400">No module information available for this year.</p>' : ''}
                </div>
            </div>
        `;
    };

    return `
        <div class="space-y-6 p-1">
            <!-- Enhanced Header with Controls -->
            <div class="bg-gradient-to-br from-primary-50 via-primary-100 to-primary-50 dark:from-primary-900/40 dark:via-primary-800/40 dark:to-primary-900/40 rounded-xl shadow-md border border-primary-200 dark:border-primary-700 overflow-hidden">
                <!-- Title Section -->
                <div class="p-6 pb-4">
                    <div class="flex items-start justify-between gap-4 mb-3">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-2">
                                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary-600 text-white">
                                    <i data-lucide="file-text" class="w-3 h-3 mr-1"></i>
                                    Programme Specification
                                </span>
                                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                    ${cohort === 'cohort' ? 'Cohort' : 'Academic Year'} ${year}/${parseInt(year) + 1}
                                </span>
                            </div>
                            <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">${data.progTitle || 'Programme Title'}</h2>
                            <p class="text-base sm:text-lg font-semibold text-primary-700 dark:text-primary-300">Code: ${data.progCode || 'N/A'}</p>
                            ${data.shortTitle ? `<p class="text-sm text-gray-600 dark:text-gray-400 mt-1 italic">${data.shortTitle}</p>` : ''}
                        </div>
                        <div class="flex-shrink-0">
                            <i data-lucide="graduation-cap" class="w-16 h-16 text-primary-300 dark:text-primary-600 opacity-60"></i>
                        </div>
                    </div>

                    <!-- Section Controls -->
                    <div class="flex flex-wrap items-center gap-2 mt-4">
                        <button
                            onclick="expandAllSections()"
                            class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-primary-700 dark:text-primary-300 bg-white dark:bg-gray-800 rounded-lg border border-primary-300 dark:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                        >
                            <i data-lucide="unfold-vertical" class="w-3.5 h-3.5 mr-1.5"></i>
                            Expand All
                        </button>
                        <button
                            onclick="collapseAllSections()"
                            class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <i data-lucide="fold-vertical" class="w-3.5 h-3.5 mr-1.5"></i>
                            Collapse All
                        </button>

                        <!-- Module Selection Controls -->
                        <div class="ml-auto flex items-center gap-2">
                            ${inModuleSelectionMode ? `
                                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" id="module-selection-counter">
                                    <i data-lucide="check-square" class="w-3 h-3 mr-1"></i>
                                    ${catalogueState.selectedModulesFromProgramme.size}/25 modules selected
                                </span>
                                <button
                                    onclick="window.clearModuleSelection()"
                                    class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <i data-lucide="x" class="w-3.5 h-3.5 mr-1.5"></i>
                                    Clear Selection
                                </button>
                                <button
                                    onclick="window.generateBulkModulesFromProgramme()"
                                    class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                                    ${catalogueState.selectedModulesFromProgramme.size === 0 ? 'disabled' : ''}
                                >
                                    <i data-lucide="download" class="w-3.5 h-3.5 mr-1.5"></i>
                                    Download Selected (ZIP)
                                </button>
                                <button
                                    onclick="window.toggleModuleSelectionMode('${progCode}')"
                                    class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 bg-white dark:bg-gray-800 rounded-lg border border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                >
                                    <i data-lucide="x-circle" class="w-3.5 h-3.5 mr-1.5"></i>
                                    Exit Selection Mode
                                </button>
                            ` : `
                                <button
                                    id="select-modules-btn"
                                    onclick="event.stopPropagation(); window.toggleModuleSelectionMode('${progCode}')"
                                    class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                                >
                                    <i data-lucide="check-square" class="w-3.5 h-3.5 mr-1.5"></i>
                                    Select Modules to Download
                                </button>
                            `}
                        </div>
                    </div>
                    </div>
                </div>

                <!-- Enhanced Stat Cards -->
                <div class="bg-white/80 dark:bg-gray-900/50 px-6 py-4 border-t border-primary-200 dark:border-primary-700">
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                        <div class="flex items-center gap-3 p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-700">
                            <div class="flex-shrink-0 p-2 bg-blue-500 rounded-lg">
                                <i data-lucide="calendar" class="w-5 h-5 text-white"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wider">Academic Year</p>
                                <p class="text-lg font-bold text-blue-900 dark:text-blue-100">${year}/${parseInt(year) + 1}</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-3 p-3 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg border border-purple-200 dark:border-purple-700">
                            <div class="flex-shrink-0 p-2 bg-purple-500 rounded-lg">
                                <i data-lucide="layers" class="w-5 h-5 text-white"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-xs font-medium text-purple-700 dark:text-purple-300 uppercase tracking-wider">Spec Type</p>
                                <p class="text-lg font-bold text-purple-900 dark:text-purple-100">${cohort === 'cohort' ? 'Cohort' : 'Academic Year'}</p>
                            </div>
                        </div>

                        ${data.mode ? `
                        <div class="flex items-center gap-3 p-3 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border border-green-200 dark:border-green-700">
                            <div class="flex-shrink-0 p-2 bg-green-500 rounded-lg">
                                <i data-lucide="monitor" class="w-5 h-5 text-white"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-xs font-medium text-green-700 dark:text-green-300 uppercase tracking-wider">Mode</p>
                                <p class="text-lg font-bold text-green-900 dark:text-green-100">${data.mode}</p>
                            </div>
                        </div>
                        ` : ''}

                        ${data.campus ? `
                        <div class="flex items-center gap-3 p-3 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg border border-amber-200 dark:border-amber-700">
                            <div class="flex-shrink-0 p-2 bg-amber-500 rounded-lg">
                                <i data-lucide="map-pin" class="w-5 h-5 text-white"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-xs font-medium text-amber-700 dark:text-amber-300 uppercase tracking-wider">Campus</p>
                                <p class="text-lg font-bold text-amber-900 dark:text-amber-100">${data.campus}</p>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>

            <!-- Core Details Grid -->
            <div id="section-details" class="grid grid-cols-1 md:grid-cols-2 gap-5 scroll-mt-6">
                <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div class="flex items-center gap-2 mb-4">
                        <div class="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <i data-lucide="info" class="w-4 h-4 text-blue-600 dark:text-blue-400"></i>
                        </div>
                        <h3 class="font-semibold text-gray-900 dark:text-gray-100">Programme Details</h3>
                    </div>
                    <dl class="space-y-2">
                        <div class="flex justify-between">
                            <dt class="text-gray-600 dark:text-gray-400">College:</dt>
                            <dd class="text-gray-900 dark:text-gray-100 font-medium text-right">${data.college || 'N/A'}</dd>
                        </div>
                        <div class="flex justify-between">
                            <dt class="text-gray-600 dark:text-gray-400">School:</dt>
                            <dd class="text-gray-900 dark:text-gray-100 font-medium text-right">${data.school || 'N/A'}</dd>
                        </div>
                        <div class="flex justify-between">
                            <dt class="text-gray-600 dark:text-gray-400">Department 1:</dt>
                            <dd class="text-gray-900 dark:text-gray-100 font-medium text-right">${data.dept1 || 'N/A'}</dd>
                        </div>
                        ${data.dept2 ? `
                        <div class="flex justify-between">
                            <dt class="text-gray-600 dark:text-gray-400">Department 2:</dt>
                            <dd class="text-gray-900 dark:text-gray-100 font-medium text-right">${data.dept2}</dd>
                        </div>
                        ` : ''}
                        <div class="flex justify-between">
                            <dt class="text-gray-600 dark:text-gray-400">Length:</dt>
                            <dd class="text-gray-900 dark:text-gray-100 font-medium text-right">${data.length || 'N/A'}</dd>
                        </div>
                        <div class="flex justify-between">
                            <dt class="text-gray-600 dark:text-gray-400">ATAS:</dt>
                            <dd class="text-gray-900 dark:text-gray-100 font-medium text-right">${data.atas || 'N/A'}</dd>
                        </div>
                    </dl>
                </div>

                <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div class="flex items-center gap-2 mb-4">
                        <div class="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <i data-lucide="clipboard-list" class="w-4 h-4 text-purple-600 dark:text-purple-400"></i>
                        </div>
                        <h3 class="font-semibold text-gray-900 dark:text-gray-100">Additional Information</h3>
                    </div>
                    <dl class="space-y-2">
                        ${data.regBody ? `
                        <div class="flex justify-between">
                            <dt class="text-gray-600 dark:text-gray-400">Regulatory Body:</dt>
                            <dd class="text-gray-900 dark:text-gray-100 font-medium text-right">${data.regBody}</dd>
                        </div>
                        ` : ''}
                        ${data.subject1 ? `
                        <div class="flex justify-between">
                            <dt class="text-gray-600 dark:text-gray-400">Subject 1:</dt>
                            <dd class="text-gray-900 dark:text-gray-100 font-medium text-right">${data.subject1}</dd>
                        </div>
                        ` : ''}
                        ${data.subject2 ? `
                        <div class="flex justify-between">
                            <dt class="text-gray-600 dark:text-gray-400">Subject 2:</dt>
                            <dd class="text-gray-900 dark:text-gray-100 font-medium text-right">${data.subject2}</dd>
                        </div>
                        ` : ''}
                        ${data.subject3 ? `
                        <div class="flex justify-between">
                            <dt class="text-gray-600 dark:text-gray-400">Subject 3:</dt>
                            <dd class="text-gray-900 dark:text-gray-100 font-medium text-right">${data.subject3}</dd>
                        </div>
                        ` : ''}
                        ${data.accreditationBool ? `
                        <div class="flex justify-between">
                            <dt class="text-gray-600 dark:text-gray-400">Accreditation:</dt>
                            <dd class="text-gray-900 dark:text-gray-100 font-medium text-right">${data.accreditation || 'Yes'}</dd>
                        </div>
                        ` : ''}
                        ${data.partner ? `
                        <div class="flex justify-between">
                            <dt class="text-gray-600 dark:text-gray-400">Partner:</dt>
                            <dd class="text-gray-900 dark:text-gray-100 font-medium text-right">${data.partner}</dd>
                        </div>
                        ` : ''}
                    </dl>
                </div>
            </div>
            
            <!-- Programme Aims -->
            ${data.aims && data.aims.length > 0 ? `
            <div id="section-aims" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow scroll-mt-6">
                <div class="flex items-center gap-2 mb-4">
                    <div class="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <i data-lucide="target" class="w-4 h-4 text-green-600 dark:text-green-400"></i>
                    </div>
                    <h3 class="font-semibold text-gray-900 dark:text-gray-100">Programme Aims</h3>
                </div>
                <div class="text-gray-700 dark:text-gray-300 space-y-3">
                    ${Array.isArray(data.aims) ? data.aims.map(aim => `<p>${aim}</p>`).join('') : `<p>${data.aims}</p>`}
                </div>
            </div>
            ` : ''}
            
            <!-- Learning Outcomes Section -->
            ${(data.knowledge && (data.knowledge.outcome || data.knowledge.learning || data.knowledge.assessment)) ||
              (data.skills && (data.skills.outcome || data.skills.learning || data.skills.assessment)) ? `
            <div id="section-outcomes" class="border-l-4 border-l-blue-500 dark:border-l-blue-400 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden scroll-mt-6 shadow-sm hover:shadow-md transition-shadow">
                <button onclick="toggleSection('outcomes', event)" class="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/20 dark:to-transparent hover:from-blue-100 dark:hover:from-blue-900/30 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 flex items-center justify-between transition-colors group" aria-expanded="false" aria-controls="outcomes-content">
                    <div class="flex items-center space-x-3">
                        <i data-lucide="chevron-right" class="w-5 h-5 text-blue-600 dark:text-blue-400 transform transition-transform" id="outcomes-icon"></i>
                        <div class="flex items-center gap-3">
                            <span class="font-semibold text-gray-900 dark:text-gray-100">Learning Outcomes</span>
                            <span class="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">
                                ${(data.knowledge?.outcome?.length || 0) + (data.skills?.outcome?.length || 0)} outcomes
                            </span>
                        </div>
                    </div>
                    <span class="text-xs text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">Click to expand</span>
                </button>
                <div id="outcomes-content" class="hidden p-5 bg-white dark:bg-gray-900">
                    <!-- Two-column grid layout -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <!-- Knowledge Column -->
                        ${data.knowledge ? `
                        <div class="space-y-3">
                            <h4 class="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                                <i data-lucide="lightbulb" class="w-5 h-5 mr-2"></i>
                                Knowledge and Understanding
                            </h4>

                            <!-- Outcomes Card -->
                            ${data.knowledge.outcome && data.knowledge.outcome.length > 0 ? `
                            <div class="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 p-3.5 rounded-r-lg">
                                <div class="flex items-center mb-2.5">
                                    <i data-lucide="target" class="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2"></i>
                                    <h5 class="font-semibold text-gray-900 dark:text-gray-100">Outcomes</h5>
                                </div>
                                <div class="space-y-1.5">
                                    ${data.knowledge.outcome.map((item, index) => `
                                        <div class="flex items-start gap-2.5 p-2.5 bg-blue-100/50 dark:bg-blue-800/30 rounded-lg">
                                            ${renderNumberBadge(index + 1, 'blue')}
                                            <p class="text-sm text-gray-700 dark:text-gray-300 flex-1 leading-relaxed">${stripNumbering(item)}</p>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            ` : ''}

                            <!-- Learning Methods Card -->
                            ${data.knowledge.learning && data.knowledge.learning.length > 0 ? `
                            <div class="border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20 p-3.5 rounded-r-lg">
                                <div class="flex items-center mb-2.5">
                                    <i data-lucide="book-open" class="w-4 h-4 text-green-600 dark:text-green-400 mr-2"></i>
                                    <h5 class="font-semibold text-gray-900 dark:text-gray-100">Learning & Teaching Methods</h5>
                                </div>
                                ${data.knowledge.learning.some(item => detectNumbering(item)) ? `
                                    <div class="space-y-1.5">
                                        ${data.knowledge.learning.map((item, index) => `
                                            <div class="flex items-start gap-2.5 p-2.5 bg-green-100/50 dark:bg-green-800/30 rounded-lg">
                                                ${renderNumberBadge(index + 1, 'green')}
                                                <p class="text-sm text-gray-700 dark:text-gray-300 flex-1 leading-relaxed">${stripNumbering(item)}</p>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : `
                                    <div class="text-sm text-gray-700 dark:text-gray-300 space-y-1.5">
                                        ${data.knowledge.learning.map(item => `<p class="leading-relaxed">${item}</p>`).join('')}
                                    </div>
                                `}
                            </div>
                            ` : ''}

                            <!-- Assessment Card -->
                            ${data.knowledge.assessment && data.knowledge.assessment.length > 0 ? `
                            <div class="border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-900/20 p-3.5 rounded-r-lg">
                                <div class="flex items-center mb-2.5">
                                    <i data-lucide="clipboard-check" class="w-4 h-4 text-purple-600 dark:text-purple-400 mr-2"></i>
                                    <h5 class="font-semibold text-gray-900 dark:text-gray-100">Assessment Methods</h5>
                                </div>
                                ${data.knowledge.assessment.some(item => detectNumbering(item)) ? `
                                    <div class="space-y-1.5">
                                        ${data.knowledge.assessment.map((item, index) => `
                                            <div class="flex items-start gap-2.5 p-2.5 bg-purple-100/50 dark:bg-purple-800/30 rounded-lg">
                                                ${renderNumberBadge(index + 1, 'purple')}
                                                <p class="text-sm text-gray-700 dark:text-gray-300 flex-1 leading-relaxed">${stripNumbering(item)}</p>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : `
                                    <div class="text-sm text-gray-700 dark:text-gray-300 space-y-1.5">
                                        ${data.knowledge.assessment.map(item => `<p class="leading-relaxed">${item}</p>`).join('')}
                                    </div>
                                `}
                            </div>
                            ` : ''}
                        </div>
                        ` : ''}

                        <!-- Skills Column -->
                        ${data.skills ? `
                        <div class="space-y-3">
                            <h4 class="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                                <i data-lucide="zap" class="w-5 h-5 mr-2"></i>
                                Skills and Other Attributes
                            </h4>

                            <!-- Outcomes Card -->
                            ${data.skills.outcome && data.skills.outcome.length > 0 ? `
                            <div class="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 p-3.5 rounded-r-lg">
                                <div class="flex items-center mb-2.5">
                                    <i data-lucide="target" class="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2"></i>
                                    <h5 class="font-semibold text-gray-900 dark:text-gray-100">Outcomes</h5>
                                </div>
                                <div class="space-y-1.5">
                                    ${data.skills.outcome.map((item, index) => `
                                        <div class="flex items-start gap-2.5 p-2.5 bg-blue-100/50 dark:bg-blue-800/30 rounded-lg">
                                            ${renderNumberBadge(index + 1, 'blue')}
                                            <p class="text-sm text-gray-700 dark:text-gray-300 flex-1 leading-relaxed">${stripNumbering(item)}</p>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            ` : ''}

                            <!-- Learning Methods Card -->
                            ${data.skills.learning && data.skills.learning.length > 0 ? `
                            <div class="border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20 p-3.5 rounded-r-lg">
                                <div class="flex items-center mb-2.5">
                                    <i data-lucide="book-open" class="w-4 h-4 text-green-600 dark:text-green-400 mr-2"></i>
                                    <h5 class="font-semibold text-gray-900 dark:text-gray-100">Learning & Teaching Methods</h5>
                                </div>
                                ${data.skills.learning.some(item => detectNumbering(item)) ? `
                                    <div class="space-y-1.5">
                                        ${data.skills.learning.map((item, index) => `
                                            <div class="flex items-start gap-2.5 p-2.5 bg-green-100/50 dark:bg-green-800/30 rounded-lg">
                                                ${renderNumberBadge(index + 1, 'green')}
                                                <p class="text-sm text-gray-700 dark:text-gray-300 flex-1 leading-relaxed">${stripNumbering(item)}</p>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : `
                                    <div class="text-sm text-gray-700 dark:text-gray-300 space-y-1.5">
                                        ${data.skills.learning.map(item => `<p class="leading-relaxed">${item}</p>`).join('')}
                                    </div>
                                `}
                            </div>
                            ` : ''}

                            <!-- Assessment Card -->
                            ${data.skills.assessment && data.skills.assessment.length > 0 ? `
                            <div class="border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-900/20 p-3.5 rounded-r-lg">
                                <div class="flex items-center mb-2.5">
                                    <i data-lucide="clipboard-check" class="w-4 h-4 text-purple-600 dark:text-purple-400 mr-2"></i>
                                    <h5 class="font-semibold text-gray-900 dark:text-gray-100">Assessment Methods</h5>
                                </div>
                                ${data.skills.assessment.some(item => detectNumbering(item)) ? `
                                    <div class="space-y-1.5">
                                        ${data.skills.assessment.map((item, index) => `
                                            <div class="flex items-start gap-2.5 p-2.5 bg-purple-100/50 dark:bg-purple-800/30 rounded-lg">
                                                ${renderNumberBadge(index + 1, 'purple')}
                                                <p class="text-sm text-gray-700 dark:text-gray-300 flex-1 leading-relaxed">${stripNumbering(item)}</p>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : `
                                    <div class="text-sm text-gray-700 dark:text-gray-300 space-y-1.5">
                                        ${data.skills.assessment.map(item => `<p class="leading-relaxed">${item}</p>`).join('')}
                                    </div>
                                `}
                            </div>
                            ` : ''}
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            ` : ''}
            
            <!-- Year Sections -->
            <div id="section-structure" class="space-y-3 scroll-mt-6">
                <h3 class="font-semibold text-gray-900 dark:text-gray-100">Programme Structure</h3>
                ${data.years ? `
                    ${renderYearSection(data.years.year0, 0, data.year0Exists)}
                    ${renderYearSection(data.years.year1, 1, data.year1Exists)}
                    ${renderYearSection(data.years.year2, 2, data.year2Exists)}
                    ${renderYearSection(data.years.year3, 3, data.year3Exists)}
                    ${renderYearSection(data.years.year4, 4, data.year4Exists)}
                    ${renderYearSection(data.years.year5, 5, data.year5Exists)}
                ` : '<p class="text-gray-500 dark:text-gray-400">No programme structure information available.</p>'}
            </div>
            
            <!-- Benchmark Statement -->
            ${data.benchmark ? `
            <div id="section-benchmark" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow scroll-mt-6">
                <div class="flex items-center gap-2 mb-4">
                    <div class="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                        <i data-lucide="bookmark" class="w-4 h-4 text-amber-600 dark:text-amber-400"></i>
                    </div>
                    <h3 class="font-semibold text-gray-900 dark:text-gray-100">Benchmark Statement</h3>
                </div>
                <p class="text-gray-700 dark:text-gray-300">${data.benchmark}</p>
            </div>
            ` : ''}
            
            <!-- Similar Programmes Warning -->
            ${data.matchedBoolean && data.matchedProgs ? `
            <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
                <h3 class="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                    <i data-lucide="alert-triangle" class="inline w-5 h-5 mr-2"></i>
                    Similar Programmes Found
                </h3>
                <ul class="list-disc list-inside text-yellow-700 dark:text-yellow-300">
                    ${data.matchedProgs.map(prog => `<li>${prog}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
        </div>
    `;
}

// Generate module preview HTML
window.generateModulePreview = function(data, year) {
    // Helper function to calculate total hours
    const calculateTotalHours = () => {
        const hours = [
            data.lecture, data.seminar, data.tutorial, data.project,
            data.demo, data.practical, data.workshop, data.fieldwork,
            data.visits, data.work, data.placement, data.abroad, data.independent
        ].filter(h => h && !isNaN(parseInt(h)));
        return hours.reduce((sum, h) => sum + parseInt(h), 0);
    };

    // Helper function to check if additional information exists
    const hasValue = (val) => {
        if (!val) return false;
        if (Array.isArray(val)) return val.length > 0;
        if (typeof val === 'string') return val.trim().length > 0;
        return true;
    };
    const hasAdditionalInfo = !!(hasValue(data.prereqs) ||
                                  hasValue(data.coreqs) ||
                                  hasValue(data.examPeriod) ||
                                  hasValue(data.ctExam));

    // Helper function to render contact hours table
    const renderContactHours = () => {
        const contactTypes = [
            { label: 'Lectures', value: data.lecture },
            { label: 'Seminars', value: data.seminar },
            { label: 'Tutorials', value: data.tutorial },
            { label: 'Project Supervision', value: data.project },
            { label: 'Demonstrations', value: data.demo },
            { label: 'Practical Classes', value: data.practical },
            { label: 'Workshops', value: data.workshop },
            { label: 'Fieldwork', value: data.fieldwork },
            { label: 'External Visits', value: data.visits },
            { label: 'Work-based Learning', value: data.work },
            { label: 'Placement', value: data.placement },
            { label: 'Study Abroad', value: data.abroad },
            { label: 'Independent Study', value: data.independent }
        ].filter(item => item.value && item.value !== '0');

        if (contactTypes.length === 0) return '<p class="text-gray-500 dark:text-gray-400">No contact hours information available.</p>';

        return `
            <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table class="min-w-full">
                    <thead class="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-700">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Type</th>
                            <th class="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Hours</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white dark:bg-gray-900">
                        ${contactTypes.map((item, index) => `
                            <tr class="${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'} hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                                <td class="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">${item.label}</td>
                                <td class="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right font-medium">${item.value}</td>
                            </tr>
                        `).join('')}
                        <tr class="bg-gradient-to-r from-primary-100 to-primary-50 dark:from-primary-900/40 dark:to-primary-800/30 border-t-2 border-primary-300 dark:border-primary-700">
                            <td class="px-4 py-3 text-sm font-bold text-gray-900 dark:text-gray-100">Total</td>
                            <td class="px-4 py-3 text-sm font-bold text-gray-900 dark:text-gray-100 text-right">${calculateTotalHours()}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    };

    return `
        <div class="space-y-6 p-1">
            <!-- Enhanced Header with Controls -->
            <div class="bg-gradient-to-br from-primary-50 via-primary-100 to-primary-50 dark:from-primary-900/40 dark:via-primary-800/40 dark:to-primary-900/40 rounded-xl shadow-md border border-primary-200 dark:border-primary-700 overflow-hidden">
                <!-- Title Section -->
                <div class="p-6 pb-4">
                    <div class="flex items-start justify-between gap-4 mb-3">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-2">
                                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary-600 text-white">
                                    <i data-lucide="book-open" class="w-3 h-3 mr-1"></i>
                                    Module Specification
                                </span>
                                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                    Academic Year ${year}/${parseInt(year) + 1}
                                </span>
                                ${data.semester ? `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                    ${data.semester}
                                </span>` : ''}
                            </div>
                            <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">${data.title || 'Module Title'}</h2>
                            <p class="text-base sm:text-lg font-semibold text-primary-700 dark:text-primary-300">Code: ${data.code || 'N/A'}</p>
                        </div>
                        <div class="flex-shrink-0">
                            <i data-lucide="book-open" class="w-16 h-16 text-primary-300 dark:text-primary-600 opacity-60"></i>
                        </div>
                    </div>

                    <!-- Section Controls -->
                    <div class="flex items-center gap-2 mt-4">
                        <button
                            onclick="expandAllSections()"
                            class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-primary-700 dark:text-primary-300 bg-white dark:bg-gray-800 rounded-lg border border-primary-300 dark:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                        >
                            <i data-lucide="unfold-vertical" class="w-3.5 h-3.5 mr-1.5"></i>
                            Expand All
                        </button>
                        <button
                            onclick="collapseAllSections()"
                            class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <i data-lucide="fold-vertical" class="w-3.5 h-3.5 mr-1.5"></i>
                            Collapse All
                        </button>
                    </div>
                </div>

                <!-- Enhanced Stat Cards -->
                <div class="bg-white/80 dark:bg-gray-900/50 px-6 py-4 border-t border-primary-200 dark:border-primary-700">
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                        <div class="flex items-center gap-3 p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-700">
                            <div class="flex-shrink-0 p-2 bg-blue-500 rounded-lg">
                                <i data-lucide="calendar" class="w-5 h-5 text-white"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wider">Academic Year</p>
                                <p class="text-lg font-bold text-blue-900 dark:text-blue-100">${year}/${parseInt(year) + 1}</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-3 p-3 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border border-green-200 dark:border-green-700">
                            <div class="flex-shrink-0 p-2 bg-green-500 rounded-lg">
                                <i data-lucide="award" class="w-5 h-5 text-white"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-xs font-medium text-green-700 dark:text-green-300 uppercase tracking-wider">Credits</p>
                                <p class="text-lg font-bold text-green-900 dark:text-green-100">${data.credits || '0'}</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-3 p-3 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg border border-purple-200 dark:border-purple-700">
                            <div class="flex-shrink-0 p-2 ${
                                data.level === 'LC' || data.level === 'C' ? 'bg-yellow-500' :
                                data.level === 'LI' || data.level === 'I' ? 'bg-blue-500' :
                                data.level === 'LH' || data.level === 'H' ? 'bg-green-500' :
                                data.level === 'LM' || data.level === 'M' ? 'bg-red-500' : 'bg-purple-500'
                            } rounded-lg">
                                <i data-lucide="trending-up" class="w-5 h-5 text-white"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-xs font-medium text-purple-700 dark:text-purple-300 uppercase tracking-wider">Level</p>
                                <p class="text-lg font-bold ${
                                    data.level === 'LC' || data.level === 'C' ? 'text-yellow-700 dark:text-yellow-300' :
                                    data.level === 'LI' || data.level === 'I' ? 'text-blue-700 dark:text-blue-300' :
                                    data.level === 'LH' || data.level === 'H' ? 'text-green-700 dark:text-green-300' :
                                    data.level === 'LM' || data.level === 'M' ? 'text-red-700 dark:text-red-300' : 'text-purple-900 dark:text-purple-100'
                                }">${data.level || 'N/A'}</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-3 p-3 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg border border-amber-200 dark:border-amber-700">
                            <div class="flex-shrink-0 p-2 bg-amber-500 rounded-lg">
                                <i data-lucide="clock" class="w-5 h-5 text-white"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-xs font-medium text-amber-700 dark:text-amber-300 uppercase tracking-wider">Total Hours</p>
                                <p class="text-lg font-bold text-amber-900 dark:text-amber-100">${calculateTotalHours()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Core Details Grid -->
            <div id="section-details" class="grid grid-cols-1 ${hasAdditionalInfo ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-5 scroll-mt-6">
                <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div class="flex items-center gap-2 mb-4">
                        <div class="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <i data-lucide="info" class="w-4 h-4 text-blue-600 dark:text-blue-400"></i>
                        </div>
                        <h3 class="font-semibold text-gray-900 dark:text-gray-100">Module Details</h3>
                    </div>
                    <dl class="space-y-2">
                        <div class="flex justify-between">
                            <dt class="text-gray-600 dark:text-gray-400">School:</dt>
                            <dd class="text-gray-900 dark:text-gray-100 font-medium text-right">${data.school || 'N/A'}</dd>
                        </div>
                        <div class="flex justify-between">
                            <dt class="text-gray-600 dark:text-gray-400">Department:</dt>
                            <dd class="text-gray-900 dark:text-gray-100 font-medium text-right">${data.dept || 'N/A'}</dd>
                        </div>
                        <!-- Editable Semester Field -->
                        <div class="flex justify-between items-center">
                            <dt class="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                <span>Semester:</span>
                                <span class="group relative inline-flex">
                                    <i data-lucide="info" class="w-4 h-4 text-gray-400 hover:text-primary-500 cursor-help transition-colors"></i>
                                    <span class="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-64 p-2 text-xs text-white bg-gray-900 dark:bg-gray-700 rounded shadow-lg z-10">
                                        Change the semester when this module runs. An email notification will be sent to confirm the change.
                                        <span class="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></span>
                                    </span>
                                </span>
                            </dt>
                            <dd class="flex items-center gap-2">
                                <select
                                    id="edit-semester"
                                    data-original-value="${data.semester || 'N/A'}"
                                    data-module-code="${data.code}"
                                    data-module-title="${data.title}"
                                    data-module-year="${year}"
                                    class="text-sm px-2 py-1 border-l-2 border-l-primary-500 border-y border-r border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent hover:border-primary-300 hover:bg-primary-50/50 dark:hover:bg-primary-900/20 transition-all duration-200 cursor-pointer"
                                >
                                    <option value="Semester 1" ${data.semester === 'Semester 1' ? 'selected' : ''}>Semester 1</option>
                                    <option value="Semester 2" ${data.semester === 'Semester 2' ? 'selected' : ''}>Semester 2</option>
                                    <option value="Summer Period" ${data.semester === 'Summer Period' ? 'selected' : ''}>Summer Period</option>
                                    <option value="Full Term" ${data.semester === 'Full Term' ? 'selected' : ''}>Full Term</option>
                                </select>
                                <button
                                    id="submit-semester-change"
                                    class="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white text-xs rounded transition-colors duration-200 flex-shrink-0"
                                    style="display: none;"
                                >
                                    Submit Change
                                </button>
                            </dd>
                        </div>
                        <div class="flex justify-between">
                            <dt class="text-gray-600 dark:text-gray-400">Campus:</dt>
                            <dd class="text-gray-900 dark:text-gray-100 font-medium text-right">${data.campus || 'N/A'}</dd>
                        </div>
                        <!-- Editable Module Lead Field -->
                        <div class="flex justify-between items-center">
                            <dt class="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                <span>Module Lead:</span>
                                <span class="group relative inline-flex">
                                    <i data-lucide="info" class="w-4 h-4 text-gray-400 hover:text-primary-500 cursor-help transition-colors"></i>
                                    <span class="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-64 p-2 text-xs text-white bg-gray-900 dark:bg-gray-700 rounded shadow-lg z-10">
                                        Update the person responsible for coordinating this module. An email notification will be sent to confirm the change.
                                        <span class="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></span>
                                    </span>
                                </span>
                            </dt>
                            <dd class="flex items-center gap-2">
                                <div class="relative w-56">
                                    <textarea
                                        id="edit-module-lead"
                                        data-original-value="${data.lead || ''}"
                                        data-module-code="${data.code}"
                                        data-module-title="${data.title}"
                                        data-module-year="${year}"
                                        placeholder="Enter module lead name"
                                        rows="1"
                                        class="text-sm px-2 py-1.5 pr-8 border-l-2 border-l-primary-500 border-y border-r border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent hover:border-primary-300 hover:bg-primary-50/50 dark:hover:bg-primary-900/20 transition-all duration-200 cursor-text w-full resize-none overflow-y-auto max-h-24"
                                    >${data.lead || ''}</textarea>
                                    <i data-lucide="edit-3" class="w-4 h-4 text-gray-400 absolute top-2 right-2 pointer-events-none"></i>
                                </div>
                                <button
                                    id="submit-lead-change"
                                    class="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white text-xs rounded transition-colors duration-200 flex-shrink-0 self-start"
                                    style="display: none;"
                                >
                                    Submit Change
                                </button>
                            </dd>
                        </div>
                    </dl>
                </div>

                ${hasAdditionalInfo ? `
                <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div class="flex items-center gap-2 mb-4">
                        <div class="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <i data-lucide="clipboard-list" class="w-4 h-4 text-purple-600 dark:text-purple-400"></i>
                        </div>
                        <h3 class="font-semibold text-gray-900 dark:text-gray-100">Additional Information</h3>
                    </div>
                    <dl class="space-y-2">
                        ${hasValue(data.prereqs) ? `
                        <div class="flex justify-between">
                            <dt class="text-gray-600 dark:text-gray-400">Prerequisites:</dt>
                            <dd class="text-gray-900 dark:text-gray-100 font-medium text-right">${data.prereqs}</dd>
                        </div>
                        ` : ''}
                        ${hasValue(data.coreqs) ? `
                        <div class="flex justify-between">
                            <dt class="text-gray-600 dark:text-gray-400">Co-requisites:</dt>
                            <dd class="text-gray-900 dark:text-gray-100 font-medium text-right">${data.coreqs}</dd>
                        </div>
                        ` : ''}
                        ${hasValue(data.examPeriod) ? `
                        <div class="flex justify-between">
                            <dt class="text-gray-600 dark:text-gray-400">Exam Period:</dt>
                            <dd class="text-gray-900 dark:text-gray-100 font-medium text-right">${data.examPeriod}</dd>
                        </div>
                        ` : ''}
                        ${hasValue(data.ctExam) ? `
                        <div class="flex justify-between">
                            <dt class="text-gray-600 dark:text-gray-400">Class Test:</dt>
                            <dd class="text-gray-900 dark:text-gray-100 font-medium text-right">${data.ctExam}</dd>
                        </div>
                        ` : ''}
                    </dl>
                </div>
                ` : ''}
            </div>
            
            <!-- Contact Hours Breakdown -->
            <div id="section-hours" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow scroll-mt-6">
                <div class="flex items-center gap-2 mb-4">
                    <div class="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                        <i data-lucide="clock" class="w-4 h-4 text-orange-600 dark:text-orange-400"></i>
                    </div>
                    <h3 class="font-semibold text-gray-900 dark:text-gray-100">Contact Hours Breakdown</h3>
                </div>
                <div class="overflow-x-auto">
                    ${renderContactHours()}
                </div>
            </div>
            
            <!-- Module Content Sections -->
            ${data.description ? `
            <div id="section-description" class="border-l-4 border-l-green-500 dark:border-l-green-400 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden scroll-mt-6 shadow-sm hover:shadow-md transition-shadow">
                <button onclick="toggleSection('description', event)" class="w-full px-4 py-3 bg-gradient-to-r from-green-50 to-transparent dark:from-green-900/20 dark:to-transparent hover:from-green-100 dark:hover:from-green-900/30 flex items-center justify-between transition-colors group">
                    <div class="flex items-center space-x-3">
                        <i data-lucide="chevron-right" class="w-5 h-5 text-green-600 dark:text-green-400 transform transition-transform" id="description-icon"></i>
                        <span class="font-semibold text-gray-900 dark:text-gray-100">Module Description</span>
                    </div>
                    <span class="text-xs text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">Click to expand</span>
                </button>
                <div id="description-content" class="hidden p-4 bg-white dark:bg-gray-900">
                    <div class="text-gray-700 dark:text-gray-300">${data.description}</div>
                </div>
            </div>
            ` : ''}
            
            ${data.outcomes && data.outcomes.length > 0 ? `
            <div id="section-outcomes" class="border-l-4 border-l-blue-500 dark:border-l-blue-400 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden scroll-mt-6 shadow-sm hover:shadow-md transition-shadow">
                <button onclick="toggleSection('outcomes-mod', event)" class="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/20 dark:to-transparent hover:from-blue-100 dark:hover:from-blue-900/30 flex items-center justify-between transition-colors group">
                    <div class="flex items-center space-x-3">
                        <i data-lucide="chevron-right" class="w-5 h-5 text-blue-600 dark:text-blue-400 transform transition-transform" id="outcomes-mod-icon"></i>
                        <div class="flex items-center gap-3">
                            <span class="font-semibold text-gray-900 dark:text-gray-100">Learning Outcomes</span>
                            <span class="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">
                                ${data.outcomes.length} outcome${data.outcomes.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                    <span class="text-xs text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">Click to expand</span>
                </button>
                <div id="outcomes-mod-content" class="hidden p-4 bg-white dark:bg-gray-900">
                    <div class="text-gray-700 dark:text-gray-300">
                        <p class="mb-3 font-medium">By the end of the module students should be able to:</p>
                        ${Array.isArray(data.outcomes) ?
                            '<ul class="list-disc list-inside space-y-1">' +
                            data.outcomes.map(item =>
                                item.outcome ? `<li>${item.outcome}</li>` : ''
                            ).join('') +
                            '</ul>'
                            : data.outcomes
                        }
                    </div>
                </div>
            </div>
            ` : ''}
            
            ${data.summative ? `
            <div id="section-assessment" class="border-l-4 border-l-purple-500 dark:border-l-purple-400 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden scroll-mt-6 shadow-sm hover:shadow-md transition-shadow">
                <button onclick="toggleSection('assessment', event)" class="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-transparent dark:from-purple-900/20 dark:to-transparent hover:from-purple-100 dark:hover:from-purple-900/30 flex items-center justify-between transition-colors group">
                    <div class="flex items-center space-x-3">
                        <i data-lucide="chevron-right" class="w-5 h-5 text-purple-600 dark:text-purple-400 transform transition-transform" id="assessment-icon"></i>
                        <span class="font-semibold text-gray-900 dark:text-gray-100">Assessment Methods</span>
                    </div>
                    <span class="text-xs text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">Click to expand</span>
                </button>
                <div id="assessment-content" class="hidden p-4 bg-white dark:bg-gray-900">
                    <div class="text-gray-700 dark:text-gray-300">
                        <h4 class="font-medium text-gray-900 dark:text-gray-100 mb-2">Summative Assessment</h4>
                        <p class="mb-4">${Array.isArray(data.summative)
                            ? data.summative.map(item => typeof item === 'string' ? item.replace(/^Assessments?:\s*/i, '') : item).join('<br>')
                            : (typeof data.summative === 'string' ? data.summative.replace(/^Assessments?:\s*/i, '') : data.summative)
                        }</p>
                        ${data.reassessment ? `
                        <h4 class="font-medium text-gray-900 dark:text-gray-100 mb-2">Reassessment</h4>
                        <p>${data.reassessment}</p>
                        ` : ''}
                    </div>
                </div>
            </div>
            ` : ''}
            
            <!-- Attached Programmes -->
            ${data.attachedProgs && (data.attachedProgs.comp?.length > 0 || data.attachedProgs.optional?.length > 0) ? `
            <div id="section-programmes" class="border-l-4 border-l-indigo-500 dark:border-l-indigo-400 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden scroll-mt-6 shadow-sm hover:shadow-md transition-shadow">
                <button onclick="toggleSection('programmes', event)" class="w-full px-4 py-3 bg-gradient-to-r from-indigo-50 to-transparent dark:from-indigo-900/20 dark:to-transparent hover:from-indigo-100 dark:hover:from-indigo-900/30 flex items-center justify-between transition-colors group">
                    <div class="flex items-center space-x-3">
                        <i data-lucide="chevron-right" class="w-5 h-5 text-indigo-600 dark:text-indigo-400 transform transition-transform" id="programmes-icon"></i>
                        <div class="flex items-center gap-3">
                            <span class="font-semibold text-gray-900 dark:text-gray-100">Attached Programmes</span>
                            <span class="text-xs px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium">
                                ${(data.attachedProgs.comp?.length || 0) + (data.attachedProgs.optional?.length || 0)} programme${((data.attachedProgs.comp?.length || 0) + (data.attachedProgs.optional?.length || 0)) !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                    <span class="text-xs text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">Click to expand</span>
                </button>
                <div id="programmes-content" class="hidden p-5 bg-white dark:bg-gray-900">
                    ${data.attachedProgs.comp?.length > 0 ? `
                    <div class="mb-5">
                        <div class="flex items-center gap-2 mb-3">
                            <i data-lucide="check-circle" class="w-4 h-4 text-green-600 dark:text-green-400"></i>
                            <h4 class="font-semibold text-gray-900 dark:text-gray-100">Compulsory for:</h4>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                            ${data.attachedProgs.comp.map(prog => {
                                const progCode = typeof prog === 'string' ? prog : prog.progCode;
                                const progTitle = typeof prog === 'string' ? '' : prog.progTitle;
                                return `
                                    <div class="flex items-start gap-2.5 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                                        <div class="flex-shrink-0 px-2 py-0.5 bg-green-600 text-white text-xs font-bold rounded">
                                            ${progCode}
                                        </div>
                                        ${progTitle ? `<span class="text-sm text-gray-700 dark:text-gray-300 flex-1">${progTitle}</span>` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    ` : ''}
                    ${data.attachedProgs.optional?.length > 0 ? `
                    <div>
                        <div class="flex items-center gap-2 mb-3">
                            <i data-lucide="circle-dashed" class="w-4 h-4 text-blue-600 dark:text-blue-400"></i>
                            <h4 class="font-semibold text-gray-900 dark:text-gray-100">Optional for:</h4>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                            ${data.attachedProgs.optional.map(prog => {
                                const progCode = typeof prog === 'string' ? prog : prog.progCode;
                                const progTitle = typeof prog === 'string' ? '' : prog.progTitle;
                                return `
                                    <div class="flex items-start gap-2.5 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                                        <div class="flex-shrink-0 px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded">
                                            ${progCode}
                                        </div>
                                        ${progTitle ? `<span class="text-sm text-gray-700 dark:text-gray-300 flex-1">${progTitle}</span>` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}
            
            ${data.matchedBoolean ? `
            <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
                <h3 class="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Duplicate Modules Found</h3>
                <ul class="list-disc list-inside text-yellow-700 dark:text-yellow-300">
                    ${data.duplicate.map(mod => `<li>${mod}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
        </div>
    `;
}

// Generate programme document (existing functionality)
// Make globally accessible for window functions
window.generateProgrammeDoc = async function generateProgrammeDoc(data, cohort, year) {
    const docPath = cohort === 'cohort' ? `/speccohort${year}.docx` : `/specterm${year}.docx`;
    
    return new Promise((resolve, reject) => {
        loadFile(docPath, function(error, content) {
            if (error) {
                reject(error);
                return;
            }
            
            try {
                const zip = new PizZip(content);
                const doc = new window.docxtemplater(zip, {
                    nullGetter() { return ""; }
                });
                
                // Get today's date in dd/mm/yyyy format
                const today = new Date();
                const dd = String(today.getDate()).padStart(2, "0");
                const mm = String(today.getMonth() + 1).padStart(2, "0");
                const yyyy = today.getFullYear();
                const todayDate = dd + "/" + mm + "/" + yyyy;
                
                // Transform data to match template expectations (flatten nested structures)
                const transformedData = {
                    progCode: data.progCode,
                    progTitle: data.progTitle,
                    shortTitle: data.shortTitle,
                    college: data.college,
                    school: data.school,
                    dept1: data.dept1,
                    dept2: data.dept2,
                    mode: data.mode,
                    campus: data.campus,
                    length: data.length,
                    atas: data.atas,
                    deliveringInstitution2: data.deliveringInstitution2,
                    deliveringInstitution3: data.deliveringInstitution3,
                    regBody: data.regBody,
                    subject1: data.subject1,
                    subject2: data.subject2,
                    subject3: data.subject3,
                    aims: data.aims,
                    benchmark: data.benchmark,
                    knowledge: data.knowledge,
                    skills: data.skills,
                    accreditation: data.accreditation,
                    accreditationBool: data.accreditationBool,
                    collaboration: data.collaboration,
                    noCollab: data.noCollab,
                    partner: data.partner,
                    noPartner: data.noPartner,
                    year0Exists: data.year0Exists,
                    year1Exists: data.year1Exists,
                    year2Exists: data.year2Exists,
                    year3Exists: data.year3Exists,
                    year4Exists: data.year4Exists,
                    year5Exists: data.year5Exists,
                    year0: data.years ? data.years.year0 : undefined,
                    year1: data.years ? data.years.year1 : undefined,
                    year2: data.years ? data.years.year2 : undefined,
                    year3: data.years ? data.years.year3 : undefined,
                    year4: data.years ? data.years.year4 : undefined,
                    year5: data.years ? data.years.year5 : undefined,
                    year0OptBool: data.years && data.years.year0 && data.years.year0.rules ? data.years.year0.rules.optional.length > 0 : false,
                    year1OptBool: data.years && data.years.year1 && data.years.year1.rules ? data.years.year1.rules.optional.length > 0 : false,
                    year2OptBool: data.years && data.years.year2 && data.years.year2.rules ? data.years.year2.rules.optional.length > 0 : false,
                    year3OptBool: data.years && data.years.year3 && data.years.year3.rules ? data.years.year3.rules.optional.length > 0 : false,
                    year4OptBool: data.years && data.years.year4 && data.years.year4.rules ? data.years.year4.rules.optional.length > 0 : false,
                    year5OptBool: data.years && data.years.year5 && data.years.year5.rules ? data.years.year5.rules.optional.length > 0 : false,
                    matchedBoolean: data.matchedBoolean,
                    matchedProgs: data.matchedProgs,
                    date: todayDate
                };
                
                doc.setData(transformedData);
                doc.render();
                
                const blob = doc.getZip().generate({
                    type: "blob",
                    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                });
                
                saveAs(blob, `${data.progCode}_specification.docx`);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
}

// Generate module document (existing functionality)
// Make globally accessible for window functions
window.generateModuleDoc = async function generateModuleDoc(data, year, docType) {
    const docPath = `/module-${docType}.docx`;
    
    return new Promise((resolve, reject) => {
        loadFile(docPath, function(error, content) {
            if (error) {
                reject(error);
                return;
            }
            
            try {
                const zip = new PizZip(content);
                const doc = new window.docxtemplater(zip, {
                    nullGetter() { return ""; }
                });
                
                // Get today's date in dd/mm/yyyy format
                const today = new Date();
                const dd = String(today.getDate()).padStart(2, "0");
                const mm = String(today.getMonth() + 1).padStart(2, "0");
                const yyyy = today.getFullYear();
                const todayDate = dd + "/" + mm + "/" + yyyy;
                
                // Transform module data to match template expectations
                const transformedData = {
                    code: data.code,
                    title: data.title,
                    school: data.school,
                    dept: data.dept,
                    level: data.level,
                    credits: data.credits,
                    semester: data.semester,
                    attachedProgs: data.attachedProgs,
                    prereqs: data.prereqs,
                    coreqs: data.coreqs,
                    campus: data.campus,
                    lecture: data.lecture,
                    seminar: data.seminar,
                    tutorial: data.tutorial,
                    project: data.project,
                    demo: data.demo,
                    practical: data.practical,
                    workshop: data.workshop,
                    fieldwork: data.fieldwork,
                    visits: data.visits,
                    work: data.work,
                    placement: data.placement,
                    independent: data.independent,
                    abroad: data.abroad,
                    description: data.description,
                    outcomes: data.outcomes,
                    summative: data.summative,
                    reassessment: data.reassessment,
                    ctExam: data.ctExam,
                    examPeriod: data.examPeriod,
                    lead: data.lead,
                    matchedBoolean: data.matchedBoolean,
                    duplicate: data.duplicate,
                    anyComp: data.attachedProgs && data.attachedProgs.comp ? data.attachedProgs.comp.length > 0 : false,
                    anyOpt: data.attachedProgs && data.attachedProgs.optional ? data.attachedProgs.optional.length > 0 : false,
                    date: todayDate
                };
                
                doc.setData(transformedData);
                doc.render();
                
                const blob = doc.getZip().generate({
                    type: "blob",
                    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                });
                
                saveAs(blob, `${data.code}_specification.docx`);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
}

/**
 * Generate programme document blob (for bulk generation)
 * Returns a Promise that resolves to a Blob
 * @param {Object} data - Programme data
 * @param {string} cohort - 'cohort' or 'term'
 * @param {string} year - Academic year
 * @returns {Promise<Blob>}
 */
async function generateProgrammeDocBlob(data, cohort, year) {
    return new Promise((resolve, reject) => {
        const docPath = cohort === 'cohort' ? `/speccohort${year}.docx` : `/specterm${year}.docx`;

        loadFile(docPath, function(error, content) {
            if (error) {
                reject(new Error(`Failed to load template: ${error}`));
                return;
            }

            try {
                const zip = new PizZip(content);
                const doc = new window.docxtemplater(zip, {
                    nullGetter() { return ""; }
                });

                // Get today's date in dd/mm/yyyy format
                const today = new Date();
                const dd = String(today.getDate()).padStart(2, "0");
                const mm = String(today.getMonth() + 1).padStart(2, "0");
                const yyyy = today.getFullYear();
                const todayDate = dd + "/" + mm + "/" + yyyy;

                // Transform data to match template expectations (flatten nested structures)
                const transformedData = {
                    progCode: data.progCode,
                    progTitle: data.progTitle,
                    shortTitle: data.shortTitle,
                    college: data.college,
                    school: data.school,
                    dept1: data.dept1,
                    dept2: data.dept2,
                    mode: data.mode,
                    campus: data.campus,
                    length: data.length,
                    atas: data.atas,
                    deliveringInstitution2: data.deliveringInstitution2,
                    deliveringInstitution3: data.deliveringInstitution3,
                    regBody: data.regBody,
                    subject1: data.subject1,
                    subject2: data.subject2,
                    subject3: data.subject3,
                    aims: data.aims,
                    benchmark: data.benchmark,
                    knowledge: data.knowledge,
                    skills: data.skills,
                    accreditation: data.accreditation,
                    accreditationBool: data.accreditationBool,
                    collaboration: data.collaboration,
                    noCollab: data.noCollab,
                    partner: data.partner,
                    noPartner: data.noPartner,
                    year0Exists: data.year0Exists,
                    year1Exists: data.year1Exists,
                    year2Exists: data.year2Exists,
                    year3Exists: data.year3Exists,
                    year4Exists: data.year4Exists,
                    year5Exists: data.year5Exists,
                    year0: data.years ? data.years.year0 : undefined,
                    year1: data.years ? data.years.year1 : undefined,
                    year2: data.years ? data.years.year2 : undefined,
                    year3: data.years ? data.years.year3 : undefined,
                    year4: data.years ? data.years.year4 : undefined,
                    year5: data.years ? data.years.year5 : undefined,
                    year0OptBool: data.years && data.years.year0 && data.years.year0.rules ? data.years.year0.rules.optional.length > 0 : false,
                    year1OptBool: data.years && data.years.year1 && data.years.year1.rules ? data.years.year1.rules.optional.length > 0 : false,
                    year2OptBool: data.years && data.years.year2 && data.years.year2.rules ? data.years.year2.rules.optional.length > 0 : false,
                    year3OptBool: data.years && data.years.year3 && data.years.year3.rules ? data.years.year3.rules.optional.length > 0 : false,
                    year4OptBool: data.years && data.years.year4 && data.years.year4.rules ? data.years.year4.rules.optional.length > 0 : false,
                    year5OptBool: data.years && data.years.year5 && data.years.year5.rules ? data.years.year5.rules.optional.length > 0 : false,
                    matchedBoolean: data.matchedBoolean,
                    matchedProgs: data.matchedProgs,
                    date: todayDate
                };

                doc.setData(transformedData);
                doc.render();

                const blob = doc.getZip().generate({
                    type: "blob",
                    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                });

                resolve(blob);
            } catch (err) {
                reject(new Error(`Document generation failed: ${err.message}`));
            }
        });
    });
}

/**
 * Generate module document blob (for bulk generation)
 * Returns a Promise that resolves to a Blob
 * @param {Object} data - Module data
 * @param {string} year - Academic year
 * @param {string} docType - 'spec' or 'spec+'
 * @returns {Promise<Blob>}
 */
window.generateModuleDocBlob = async function generateModuleDocBlob(data, year, docType = 'spec') {
    return new Promise((resolve, reject) => {
        // Map docType to correct template filename
        // docType can be: 'spec', '+', or 'wd'
        // Files are: module-spec.docx, module-spec+.docx, module-wd.docx
        const docPath = docType === '+'
            ? '/module-spec+.docx'
            : `/module-${docType}.docx`;

        loadFile(docPath, function(error, content) {
            if (error) {
                reject(new Error(`Failed to load template: ${error}`));
                return;
            }

            try {
                const zip = new PizZip(content);
                const doc = new window.docxtemplater(zip, {
                    nullGetter() { return ""; }
                });

                // Get today's date in dd/mm/yyyy format
                const today = new Date();
                const dd = String(today.getDate()).padStart(2, "0");
                const mm = String(today.getMonth() + 1).padStart(2, "0");
                const yyyy = today.getFullYear();
                const todayDate = dd + "/" + mm + "/" + yyyy;

                // Transform module data to match template expectations
                const transformedData = {
                    code: data.code,
                    title: data.title,
                    school: data.school,
                    dept: data.dept,
                    level: data.level,
                    credits: data.credits,
                    semester: data.semester,
                    attachedProgs: data.attachedProgs,
                    prereqs: data.prereqs,
                    coreqs: data.coreqs,
                    campus: data.campus,
                    lecture: data.lecture,
                    seminar: data.seminar,
                    tutorial: data.tutorial,
                    project: data.project,
                    demo: data.demo,
                    practical: data.practical,
                    workshop: data.workshop,
                    fieldwork: data.fieldwork,
                    visits: data.visits,
                    work: data.work,
                    placement: data.placement,
                    independent: data.independent,
                    abroad: data.abroad,
                    description: data.description,
                    outcomes: data.outcomes,
                    summative: data.summative,
                    reassessment: data.reassessment,
                    ctExam: data.ctExam,
                    examPeriod: data.examPeriod,
                    lead: data.lead,
                    matchedBoolean: data.matchedBoolean,
                    duplicate: data.duplicate,
                    anyComp: data.attachedProgs && data.attachedProgs.comp ? data.attachedProgs.comp.length > 0 : false,
                    anyOpt: data.attachedProgs && data.attachedProgs.optional ? data.attachedProgs.optional.length > 0 : false,
                    date: todayDate
                };

                doc.setData(transformedData);
                doc.render();

                const blob = doc.getZip().generate({
                    type: "blob",
                    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                });

                resolve(blob);
            } catch (err) {
                reject(new Error(`Document generation failed: ${err.message}`));
            }
        });
    });
};

/**
 * Global flag to track if bulk generation is cancelled
 */
window.bulkGenerationCancelled = false;

/**
 * Main bulk document generation function
 * Generates multiple documents and packages them into a ZIP file
 */
window.generateBulkDocuments = async function() {
    const selectedCodes = Array.from(catalogueState.selectedItems);
    const type = catalogueState.type; // 'programmes' or 'modules'

    // Validation
    if (selectedCodes.length === 0) {
        window.showNotification?.('No items selected', 'warning');
        return;
    }

    if (catalogueState.bulkGenerationInProgress) {
        window.showNotification?.('Bulk generation already in progress', 'warning');
        return;
    }

    // Validate catalogue type
    if (!type || !['programmes', 'modules'].includes(type)) {
        window.showNotification?.('Invalid catalogue type. Please refresh the page.', 'error');
        return;
    }

    // Validate year/cohort selections
    if (type === 'programmes') {
        if (!catalogueState.selectedProgrammeYear) {
            window.showNotification?.('Please select a programme year first', 'warning');
            return;
        }
        if (!catalogueState.selectedCohortType) {
            window.showNotification?.('Please select a cohort type first', 'warning');
            return;
        }
    } else if (type === 'modules') {
        if (!catalogueState.selectedModuleYear) {
            window.showNotification?.('Please select a module year first', 'warning');
            return;
        }
    }

    // Confirm if large selection
    if (selectedCodes.length > 10) {
        const confirmMsg = `Generate ${selectedCodes.length} documents?\n\n` +
                          `This may take ${Math.ceil(selectedCodes.length * 2 / 60)} minutes.\n\n` +
                          `The ZIP file will be approximately ${Math.round(selectedCodes.length * 0.5)}MB.`;

        const confirmed = await showConfirmation('Bulk Generation', confirmMsg);
        if (!confirmed) {
            return;
        }
    }

    // Initialize
    catalogueState.bulkGenerationInProgress = true;
    window.bulkGenerationCancelled = false;

    // Add warning for page navigation/close during generation
    const beforeUnloadHandler = (e) => {
        e.preventDefault();
        return e.returnValue = 'Bulk generation in progress. Leaving this page will cancel the operation.';
    };
    window.addEventListener('beforeunload', beforeUnloadHandler);

    // Show progress modal
    showBulkProgressModal();

    const zip = new JSZip();
    const successItems = [];
    const failedItems = [];

    try {
        // Process each selected item sequentially
        for (let i = 0; i < selectedCodes.length; i++) {
            // Check for cancellation
            if (window.bulkGenerationCancelled) {
                console.log('Bulk generation cancelled by user');
                window.showNotification?.('Bulk generation cancelled', 'info');
                break;
            }

            const code = selectedCodes[i];
            const progress = Math.round(((i + 1) / selectedCodes.length) * 100);

            // Update progress display
            updateBulkProgress(i + 1, selectedCodes.length, code, progress);

            try {
                let blob;
                let filename;

                if (type === 'programmes') {
                    // Fetch programme data
                    const data = await fetchProgrammeSpecData(
                        code,
                        catalogueState.selectedCohortType,
                        catalogueState.selectedProgrammeYear
                    );

                    if (!data) {
                        throw new Error('No data returned from API');
                    }

                    // Generate document blob
                    blob = await generateProgrammeDocBlob(
                        data,
                        catalogueState.selectedCohortType,
                        catalogueState.selectedProgrammeYear
                    );

                    // Create filename
                    const cohortType = catalogueState.selectedCohortType === 'cohort' ? 'cohort' : 'term';
                    filename = `${code}_${cohortType}_${catalogueState.selectedProgrammeYear}.docx`;

                } else if (type === 'modules') {
                    // Fetch module data
                    const data = await fetchModuleSpecData(
                        code,
                        catalogueState.selectedModuleYear
                    );

                    if (!data) {
                        throw new Error('No data returned from API');
                    }

                    // Generate document blob
                    blob = await generateModuleDocBlob(
                        data,
                        catalogueState.selectedModuleYear,
                        'spec'
                    );

                    // Create filename
                    filename = `${code}_${catalogueState.selectedModuleYear}.docx`;
                }

                // Add to ZIP
                zip.file(filename, blob);
                successItems.push(code);
                console.log(`✓ Generated: ${filename}`);

                // Small delay to prevent overwhelming the browser
                // and allow UI updates
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (error) {
                console.error(`✗ Failed to generate ${code}:`, error);
                failedItems.push({
                    code,
                    error: error.message || 'Unknown error'
                });
                // Continue with next item (skip failed - as per requirements)
            }
        }

        // Generate and download ZIP if we have successful documents
        if (!window.bulkGenerationCancelled && successItems.length > 0) {
            // Update progress to show ZIP creation
            updateBulkProgress(
                selectedCodes.length,
                selectedCodes.length,
                'Creating ZIP file...',
                100
            );

            // Generate ZIP file
            const zipBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            });

            // Create filename with timestamp
            const timestamp = new Date().toISOString().slice(0, 10);
            const filename = `specifications_${type}_${timestamp}.zip`;

            // Trigger download
            saveAs(zipBlob, filename);

            console.log(`✓ ZIP created: ${filename} (${successItems.length} documents)`);

            // Hide progress modal
            hideBulkProgressModal();

            // Show summary
            showBulkGenerationSummary(successItems.length, failedItems);

        } else if (!window.bulkGenerationCancelled) {
            // All documents failed
            hideBulkProgressModal();
            window.showNotification?.('All documents failed to generate', 'error');
            showBulkGenerationSummary(0, failedItems);
        } else {
            // User cancelled
            hideBulkProgressModal();
        }

    } catch (error) {
        console.error('Bulk generation critical error:', error);
        hideBulkProgressModal();
        window.showNotification?.(
            'Bulk generation failed: ' + (error.message || 'Unknown error'),
            'error'
        );
    } finally {
        catalogueState.bulkGenerationInProgress = false;
        // Remove beforeunload warning
        window.removeEventListener('beforeunload', beforeUnloadHandler);
    }
};

/**
 * Cancel ongoing bulk generation
 */
window.cancelBulkGeneration = function() {
    if (catalogueState.bulkGenerationInProgress) {
        window.bulkGenerationCancelled = true;
        if (window.DEBUG) console.log('Cancelling bulk generation...');

        // Update UI to show cancellation in progress
        const cancelBtn = document.getElementById('bulk-cancel-btn');
        if (cancelBtn) {
            cancelBtn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 inline mr-2 animate-spin"></i> Cancelling...';
            cancelBtn.disabled = true;
            cancelBtn.classList.add('opacity-50', 'cursor-not-allowed');
            lucide.createIcons();
        }
    }
};

/**
 * Show bulk progress modal
 */
window.showBulkProgressModal = function() {
    const modal = document.getElementById('bulk-progress-modal');
    if (modal) {
        modal.classList.remove('hidden');
        // Re-initialize icons in modal
        lucide.createIcons();

        // Focus trap - focus the cancel button
        const cancelBtn = document.getElementById('bulk-cancel-btn');
        if (cancelBtn) {
            setTimeout(() => cancelBtn.focus(), 100);
        }

        // Add focus trap
        const handleTabKey = (e) => {
            if (e.key === 'Tab') {
                // Only one focusable element (cancel button), so keep focus on it
                e.preventDefault();
                if (cancelBtn) cancelBtn.focus();
            }
        };
        modal.addEventListener('keydown', handleTabKey);
        modal._focusTrapHandler = handleTabKey; // Store for cleanup
    }
}

/**
 * Hide bulk progress modal
 */
window.hideBulkProgressModal = function() {
    const modal = document.getElementById('bulk-progress-modal');
    if (modal) {
        modal.classList.add('hidden');

        // Remove focus trap handler
        if (modal._focusTrapHandler) {
            modal.removeEventListener('keydown', modal._focusTrapHandler);
            delete modal._focusTrapHandler;
        }
    }
}

/**
 * Update bulk progress display
 * @param {number} current - Current item number (1-based)
 * @param {number} total - Total items
 * @param {string} itemName - Current item name/code
 * @param {number} percent - Progress percentage
 */
window.updateBulkProgress = function(current, total, itemName, percent) {
    const textEl = document.getElementById('bulk-progress-text');
    const percentEl = document.getElementById('bulk-progress-percent');
    const barEl = document.getElementById('bulk-progress-bar');
    const itemEl = document.getElementById('bulk-current-item');

    if (textEl) {
        textEl.textContent = `Processing ${current} of ${total}...`;
    }
    if (percentEl) {
        percentEl.textContent = `${percent}%`;
    }
    if (barEl) {
        barEl.style.width = `${percent}%`;
    }
    if (itemEl) {
        itemEl.textContent = itemName;
    }
}

/**
 * Update just the progress text (for custom messages)
 */
window.updateBulkProgressText = function(text) {
    const textEl = document.getElementById('bulk-progress-text');
    if (textEl) {
        textEl.textContent = text;
    }
}

/**
 * Show custom confirmation modal
 * @param {string} title - Modal title
 * @param {string} message - Confirmation message
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
 */
window.showConfirmation = function(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-confirm-modal');
        const titleEl = document.getElementById('confirm-title');
        const messageEl = document.getElementById('confirm-message');
        const okBtn = document.getElementById('confirm-ok-btn');
        const cancelBtn = document.getElementById('confirm-cancel-btn');

        if (!modal || !titleEl || !messageEl || !okBtn || !cancelBtn) {
            // Fallback to native confirm if modal not found
            resolve(confirm(message));
            return;
        }

        // Set content
        titleEl.textContent = title;
        messageEl.textContent = message;

        // Show modal
        modal.classList.remove('hidden');
        lucide.createIcons();

        // Focus OK button
        setTimeout(() => okBtn.focus(), 100);

        // Handle buttons
        const handleOk = () => {
            modal.classList.add('hidden');
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(true);
        };

        const handleCancel = () => {
            modal.classList.add('hidden');
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(false);
        };

        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);

        // ESC key to cancel
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                handleCancel();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    });
}

/**
 * Show generation summary modal
 * @param {number} successCount - Number of successful generations
 * @param {Array} failedItems - Array of {code, error} objects
 */
window.showBulkGenerationSummary = function(successCount, failedItems) {
    const modal = document.getElementById('custom-summary-modal');
    const content = document.getElementById('summary-content');
    const closeBtn = document.getElementById('summary-close-btn');

    if (!modal || !content || !closeBtn) {
        // Fallback to alert if modal not found
        let message = `✓ Successfully generated ${successCount} document${successCount !== 1 ? 's' : ''}`;
        if (failedItems.length > 0) {
            message += `\n\n✗ Failed (${failedItems.length}):\n`;
            message += failedItems.map(f => `  • ${f.code}: ${f.error}`).join('\n');
        }
        alert(message);
        return;
    }

    // Build HTML content
    let html = `
        <div class="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p class="text-green-800 dark:text-green-200 font-medium">
                <i data-lucide="check-circle" class="w-4 h-4 inline mr-2"></i>
                Successfully generated ${successCount} document${successCount !== 1 ? 's' : ''}
            </p>
        </div>
    `;

    if (failedItems.length > 0) {
        html += `
            <div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p class="text-red-800 dark:text-red-200 font-medium mb-3">
                    <i data-lucide="alert-circle" class="w-4 h-4 inline mr-2"></i>
                    Failed to generate ${failedItems.length} document${failedItems.length !== 1 ? 's' : ''}:
                </p>
                <ul class="space-y-2 text-sm">
                    ${failedItems.map(f => `
                        <li class="flex items-start gap-2">
                            <span class="text-red-600 dark:text-red-400">•</span>
                            <div>
                                <span class="font-mono font-semibold">${f.code}</span>
                                <span class="text-red-700 dark:text-red-300">: ${f.error}</span>
                            </div>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    content.innerHTML = html;
    modal.classList.remove('hidden');
    lucide.createIcons();

    // Focus close button
    setTimeout(() => closeBtn.focus(), 100);

    // Handle close
    const handleClose = () => {
        modal.classList.add('hidden');
        closeBtn.removeEventListener('click', handleClose);
    };
    closeBtn.addEventListener('click', handleClose);

    // ESC key to close
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            handleClose();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);

    // Also show notification
    if (successCount > 0) {
        window.showNotification?.(
            `Generated ${successCount} document${successCount !== 1 ? 's' : ''}`,
            'success'
        );
    }
}

// Utility function to load file
function loadFile(url, callback) {
    PizZipUtils.getBinaryContent(url, callback);
}

// Add to recent items with error handling
function addToRecent(type, item) {
    const recentList = type === 'programmes' ? recentProgrammes : recentModules;

    // Remove if already exists
    const index = recentList.findIndex(i => i.code === item.code);
    if (index > -1) {
        recentList.splice(index, 1);
    }

    // Add to beginning
    recentList.unshift(item);

    // Keep only last 10
    if (recentList.length > 10) {
        recentList.pop();
    }

    // Save to localStorage with error handling
    try {
        const key = type === 'programmes' ? 'recentProgrammes' : 'recentModules';
        localStorage.setItem(key, JSON.stringify(recentList));
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            // Storage quota exceeded, try to clear old items
            try {
                // Keep only 5 most recent items and try again
                const reducedList = recentList.slice(0, 5);
                const key = type === 'programmes' ? 'recentProgrammes' : 'recentModules';
                localStorage.setItem(key, JSON.stringify(reducedList));

                if (type === 'programmes') {
                    recentProgrammes = reducedList;
                } else {
                    recentModules = reducedList;
                }

                showNotification('Storage limit reached. Cleared old history items.', 'warning');
            } catch (retryError) {
                console.error('Could not save to localStorage even after cleanup:', retryError);
                throw retryError;
            }
        } else {
            console.error('localStorage error:', error);
            throw error;
        }
    }
}

// Global AbortController for cancelling operations
let currentAbortController = null;

// Show loading overlay with optional message and progress support
// Make globally accessible for window functions
window.showLoading = function showLoading(show, message = 'Generating specification...', options = {}) {
    const overlay = document.getElementById('loadingOverlay');
    const loadingMessage = document.getElementById('loadingMessage');
    const detailedStatus = document.getElementById('loadingDetailedStatus');
    const progressContainer = document.getElementById('loadingProgressContainer');
    const progressBar = document.getElementById('loadingProgressBar');
    const progressText = document.getElementById('loadingProgressText');
    const cancelBtn = document.getElementById('loadingCancelBtn');

    if (show) {
        // Create new AbortController for this operation
        currentAbortController = new AbortController();

        // Set main message
        if (loadingMessage) {
            loadingMessage.textContent = message;
        }

        // Show/hide progress bar based on options
        if (options.showProgress) {
            progressContainer.classList.remove('hidden');
            progressBar.style.width = '0%';
            progressText.textContent = '0%';
        } else {
            progressContainer.classList.add('hidden');
        }

        // Show/hide detailed status based on options
        if (options.detailedStatus) {
            detailedStatus.textContent = options.detailedStatus;
            detailedStatus.classList.remove('hidden');
        } else {
            detailedStatus.classList.add('hidden');
        }

        // Show cancel button (always visible)
        if (cancelBtn) {
            cancelBtn.classList.remove('hidden');
        }

        overlay.classList.remove('hidden');

        // Re-initialize Lucide icons for the cancel button
        lucide.createIcons();
    } else {
        overlay.classList.add('hidden');

        // Reset progress elements
        progressContainer.classList.add('hidden');
        detailedStatus.classList.add('hidden');
        progressBar.style.width = '0%';
        progressText.textContent = '0%';

        // Clear abort controller
        currentAbortController = null;
    }
}

// Update loading progress
window.updateLoadingProgress = function updateLoadingProgress(percent, detailedStatus = '') {
    const progressBar = document.getElementById('loadingProgressBar');
    const progressText = document.getElementById('loadingProgressText');
    const detailedStatusElement = document.getElementById('loadingDetailedStatus');

    if (progressBar && progressText) {
        const clampedPercent = Math.min(Math.max(percent, 0), 100);
        progressBar.style.width = clampedPercent + '%';
        progressText.textContent = Math.round(clampedPercent) + '%';
    }

    if (detailedStatus && detailedStatusElement) {
        detailedStatusElement.textContent = detailedStatus;
        detailedStatusElement.classList.remove('hidden');
    }
}

// Cancel current operation
window.cancelCurrentOperation = function cancelCurrentOperation() {
    if (currentAbortController) {
        currentAbortController.abort();
        showLoading(false);
        showNotification('Operation cancelled', 'info');

        // Reset button states
        const buttons = ['prog-generate-btn', 'prog-preview-btn', 'mod-generate-btn', 'mod-preview-btn'];
        buttons.forEach(btnId => setButtonLoading(btnId, false));
    }
}

// Set button loading state
// Make globally accessible for window functions
window.setButtonLoading = function setButtonLoading(buttonId, loading) {
    const button = document.getElementById(buttonId);
    if (!button) return;

    if (loading) {
        // Store original content
        button.setAttribute('data-original-html', button.innerHTML);
        button.disabled = true;
        button.classList.add('opacity-75', 'cursor-not-allowed');

        // Add spinner and loading text
        const icon = button.querySelector('i');
        const span = button.querySelector('span');
        if (icon && span) {
            icon.setAttribute('data-lucide', 'loader-2');
            icon.classList.add('animate-spin');
            span.textContent = 'Loading...';
            lucide.createIcons();
        }
    } else {
        // Restore original content
        const originalHtml = button.getAttribute('data-original-html');
        if (originalHtml) {
            button.innerHTML = originalHtml;
            lucide.createIcons();
        }
        button.disabled = false;
        button.classList.remove('opacity-75', 'cursor-not-allowed');
        button.removeAttribute('data-original-html');
    }
}

// Show notification with stacking support
// Make globally accessible for window functions
window.showNotification = function showNotification(message, type = 'info') {
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };

    const icons = {
        success: 'check-circle',
        error: 'x-circle',
        warning: 'alert-triangle',
        info: 'info'
    };

    const container = document.getElementById('notification-container');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full opacity-0`;
    notification.innerHTML = `
        <div class="flex items-center space-x-3">
            <i data-lucide="${icons[type]}" class="w-5 h-5 flex-shrink-0"></i>
            <span class="text-sm font-medium">${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 hover:text-gray-200 transition-colors" aria-label="Close notification">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        </div>
    `;

    container.appendChild(notification);
    lucide.createIcons();

    // Trigger slide-in animation
    requestAnimationFrame(() => {
        notification.classList.remove('translate-x-full', 'opacity-0');
        notification.classList.add('translate-x-0', 'opacity-100');
    });

    // Auto-dismiss after 5 seconds with slide-out animation
    setTimeout(() => {
        notification.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

} // End of attachEventListeners()

// Removed: favorites and compare functionality

// Store current preview data for download
let currentPreviewData = null;
let currentPreviewType = null;
let currentPreviewYear = null;
let currentPreviewCohort = null;
let currentPreviewDocType = null;

// Download from preview
window.downloadFromPreview = async function() {
    if (!currentPreviewData || !currentPreviewType) {
        showNotification('No data available for download', 'error');
        return;
    }

    showLoading(true, 'Generating Word document...');

    try {
        if (currentPreviewType === 'programme') {
            await generateProgrammeDoc(currentPreviewData, currentPreviewCohort, currentPreviewYear);
        } else if (currentPreviewType === 'module') {
            await generateModuleDoc(currentPreviewData, currentPreviewYear, currentPreviewDocType);
        }
        showNotification('Specification downloaded successfully!', 'success');
        closePreview();
    } catch (error) {
        console.error('Error downloading specification:', error);
        const errorMessage = error.message?.includes('template')
            ? 'Error with document template. Please contact support.'
            : 'Error downloading specification. Please try again.';
        showNotification(errorMessage, 'error');
    } finally {
        showLoading(false);
    }
};

// Close preview modal
window.closePreview = function() {
    const modal = document.getElementById('previewModal');
    const scrollBtn = document.getElementById('scrollToTopBtn');

    if (modal) {
        // Animate modal fade out
        modal.style.transition = 'opacity 0.2s ease-out';
        modal.style.opacity = '0';

        setTimeout(() => {
            modal.classList.add('hidden');
            modal.style.opacity = '';
        }, 200);
    }

    // Hide scroll to top button
    if (scrollBtn) {
        scrollBtn.classList.add('hidden');
    }

    // Remove scroll listener
    const previewContent = document.getElementById('previewContent');
    if (previewContent) {
        previewContent.removeEventListener('scroll', handlePreviewScroll);
    }

    // Remove keyboard shortcuts
    removeModalKeyboardShortcuts();

    // Clear current preview data
    currentPreviewData = null;
    currentPreviewType = null;
    currentPreviewYear = null;
    currentPreviewCohort = null;
    currentPreviewDocType = null;
};

// Handle scroll in preview modal - show/hide scroll to top button
function handlePreviewScroll() {
    const previewContent = document.getElementById('previewContent');
    const scrollBtn = document.getElementById('scrollToTopBtn');

    if (!previewContent || !scrollBtn) return;

    // Show button after scrolling down 300px
    if (previewContent.scrollTop > 300) {
        if (scrollBtn.classList.contains('hidden')) {
            scrollBtn.classList.remove('hidden');
            scrollBtn.style.opacity = '0';
            scrollBtn.style.transform = 'scale(0.8)';

            requestAnimationFrame(() => {
                scrollBtn.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                scrollBtn.style.opacity = '1';
                scrollBtn.style.transform = 'scale(1)';
            });
        }
    } else {
        if (!scrollBtn.classList.contains('hidden')) {
            scrollBtn.style.transition = 'opacity 0.2s ease-in, transform 0.2s ease-in';
            scrollBtn.style.opacity = '0';
            scrollBtn.style.transform = 'scale(0.8)';

            setTimeout(() => {
                scrollBtn.classList.add('hidden');
                scrollBtn.style.opacity = '';
                scrollBtn.style.transform = '';
            }, 200);
        }
    }
}

// Scroll preview to top smoothly
window.scrollPreviewToTop = function() {
    const previewContent = document.getElementById('previewContent');
    if (previewContent) {
        previewContent.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
};

/**
 * Add keyboard shortcuts for modal accessibility
 * Escape: Close modal
 * Ctrl/Cmd + Shift + E: Expand all sections
 * Ctrl/Cmd + Shift + C: Collapse all sections
 */
let modalKeyboardHandler = null;

function addModalKeyboardShortcuts() {
    // Remove existing handler if any
    if (modalKeyboardHandler) {
        document.removeEventListener('keydown', modalKeyboardHandler);
    }

    // Create new handler
    modalKeyboardHandler = function(e) {
        const modal = document.getElementById('previewModal');
        if (!modal || modal.classList.contains('hidden')) return;

        // Escape key: Close modal
        if (e.key === 'Escape') {
            e.preventDefault();
            window.closePreview();
            return;
        }

        // Ctrl/Cmd + Shift + E: Expand all
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
            e.preventDefault();
            window.expandAllSections();
            return;
        }

        // Ctrl/Cmd + Shift + C: Collapse all
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            window.collapseAllSections();
            return;
        }
    };

    // Add handler
    document.addEventListener('keydown', modalKeyboardHandler);
}

// Remove keyboard shortcuts when modal closes
function removeModalKeyboardShortcuts() {
    if (modalKeyboardHandler) {
        document.removeEventListener('keydown', modalKeyboardHandler);
        modalKeyboardHandler = null;
    }
}

// Open preview modal with scroll optimization
window.openPreview = function(htmlContent) {
    console.log('📖 openPreview() called');
    const modal = document.getElementById('previewModal');
    const content = document.getElementById('previewContent');
    const scrollBtn = document.getElementById('scrollToTopBtn');

    console.log('Preview elements:', { modal: !!modal, content: !!content, scrollBtn: !!scrollBtn });
    if (!modal || !content) {
        console.error('❌ Modal or content not found!');
        return;
    }

    // Set content
    content.innerHTML = htmlContent;

    // Reset scroll position
    content.scrollTop = 0;

    // Hide scroll button initially
    if (scrollBtn) {
        scrollBtn.classList.add('hidden');
    }

    // Add scroll listener with passive flag for better performance
    content.addEventListener('scroll', handlePreviewScroll, { passive: true });

    // Show modal with fade-in animation
    modal.classList.remove('hidden');
    modal.style.opacity = '0';

    requestAnimationFrame(() => {
        modal.style.transition = 'opacity 0.3s ease-in';
        modal.style.opacity = '1';
    });

    // Add keyboard shortcuts for accessibility
    addModalKeyboardShortcuts();

    // Re-initialize Lucide icons in the new content
    lucide.createIcons();

    // Attach change handlers for editable module fields
    attachModuleChangeHandlers();

    // Generate Table of Contents based on sections present
    generateTOCFromContent();
};

/**
 * Generate TOC automatically based on sections found in the content
 */
function generateTOCFromContent() {
    const sections = [];

    // Check for each possible section and add to TOC if exists
    const sectionConfigs = [
        { id: 'section-details', title: 'Details', icon: 'info' },
        { id: 'section-aims', title: 'Programme Aims', icon: 'target' },
        { id: 'section-outcomes', title: 'Learning Outcomes', icon: 'award' },
        { id: 'section-structure', title: 'Programme Structure', icon: 'layers' },
        { id: 'section-benchmark', title: 'Benchmark Statement', icon: 'bookmark' },
        { id: 'section-hours', title: 'Contact Hours', icon: 'clock' },
        { id: 'section-description', title: 'Description', icon: 'file-text' },
        { id: 'section-assessment', title: 'Assessment', icon: 'check-square' },
        { id: 'section-programmes', title: 'Attached Programmes', icon: 'link' }
    ];

    sectionConfigs.forEach(config => {
        const section = document.getElementById(config.id);
        if (section) {
            sections.push(config);
        }
    });

    // Only generate TOC if we have sections
    if (sections.length > 0) {
        generateTOC(sections);
    }
}

// Auto-expand textarea based on content
function autoExpandTextarea(textarea) {
    if (!textarea) return;

    // Reset height to auto to correctly calculate scrollHeight
    textarea.style.height = 'auto';

    // Set height based on content, with max constraint
    const maxHeight = 96; // max-h-24 = 96px (approximately 4 rows)
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = newHeight + 'px';
}

// Attach change handlers for editable fields in module preview
function attachModuleChangeHandlers() {
    console.log('🔧 Attaching module change handlers...');
    const semesterSelect = document.getElementById('edit-semester');
    const moduleLeadInput = document.getElementById('edit-module-lead');
    const semesterSubmitBtn = document.getElementById('submit-semester-change');
    const leadSubmitBtn = document.getElementById('submit-lead-change');

    console.log('Elements found:', {
        semesterSelect: !!semesterSelect,
        moduleLeadInput: !!moduleLeadInput,
        semesterSubmitBtn: !!semesterSubmitBtn,
        leadSubmitBtn: !!leadSubmitBtn
    });

    // Semester dropdown change handler
    if (semesterSelect && semesterSubmitBtn) {
        console.log('✓ Attaching semester change handler');
        semesterSelect.addEventListener('change', function() {
            const originalValue = this.dataset.originalValue;
            const newValue = this.value;
            console.log('Semester changed:', { originalValue, newValue, changed: newValue !== originalValue });

            if (newValue !== originalValue) {
                console.log('Showing semester submit button');
                semesterSubmitBtn.style.display = 'inline-block';
            } else {
                console.log('Hiding semester submit button');
                semesterSubmitBtn.style.display = 'none';
            }
        });

        // Semester submit button click handler
        semesterSubmitBtn.addEventListener('click', function() {
            const originalValue = semesterSelect.dataset.originalValue;
            const newValue = semesterSelect.value;
            const moduleCode = semesterSelect.dataset.moduleCode;
            const moduleTitle = semesterSelect.dataset.moduleTitle;
            const moduleYear = semesterSelect.dataset.moduleYear;

            openModuleChangeConfirmation({
                code: moduleCode,
                title: moduleTitle,
                year: moduleYear
            }, 'Semester', originalValue, newValue);
        });
    }

    // Module Lead input change handler
    if (moduleLeadInput && leadSubmitBtn) {
        console.log('✓ Attaching module lead change handler');

        // Initialize auto-expand for pre-existing text
        autoExpandTextarea(moduleLeadInput);

        moduleLeadInput.addEventListener('input', function() {
            // Auto-expand textarea as user types
            autoExpandTextarea(this);

            const originalValue = this.dataset.originalValue;
            const newValue = this.value.trim();
            console.log('Module lead changed:', { originalValue, newValue, changed: newValue !== originalValue });

            if (newValue !== originalValue) {
                console.log('Showing lead submit button');
                leadSubmitBtn.style.display = 'inline-block';
            } else {
                console.log('Hiding lead submit button');
                leadSubmitBtn.style.display = 'none';
            }
        });

        // Module Lead submit button click handler
        leadSubmitBtn.addEventListener('click', function() {
            const originalValue = moduleLeadInput.dataset.originalValue;
            const newValue = moduleLeadInput.value.trim();
            const moduleCode = moduleLeadInput.dataset.moduleCode;
            const moduleTitle = moduleLeadInput.dataset.moduleTitle;
            const moduleYear = moduleLeadInput.dataset.moduleYear;

            openModuleChangeConfirmation({
                code: moduleCode,
                title: moduleTitle,
                year: moduleYear
            }, 'Module Lead', originalValue, newValue);
        });
    }
}

// Open confirmation modal for module change
function openModuleChangeConfirmation(moduleData, field, oldValue, newValue) {
    const modal = document.getElementById('moduleChangeConfirmModal');
    if (!modal) {
        console.error('Module change confirmation modal not found');
        return;
    }

    // Set confirmation details
    document.getElementById('confirm-module-code').textContent = moduleData.code;
    document.getElementById('confirm-module-title').textContent = moduleData.title;
    document.getElementById('confirm-field-name').textContent = field;
    document.getElementById('confirm-old-value').textContent = oldValue || '(not set)';
    document.getElementById('confirm-new-value').textContent = newValue;

    // Show semester warning if field is Semester
    const semesterWarning = document.getElementById('semester-warning');
    if (semesterWarning) {
        if (field === 'Semester') {
            semesterWarning.classList.remove('hidden');
            // Initialize the alert icon
            if (window.lucide) lucide.createIcons();
        } else {
            semesterWarning.classList.add('hidden');
        }
    }

    // Load saved requester name from localStorage
    const requesterNameInput = document.getElementById('confirm-requester-name');
    const requesterNameError = document.getElementById('requester-name-error');
    if (requesterNameInput) {
        const savedName = localStorage.getItem('moduleChangeRequesterName') || '';
        requesterNameInput.value = savedName;
        // Clear any previous validation errors
        requesterNameInput.classList.remove('border-red-500');
        if (requesterNameError) {
            requesterNameError.classList.add('hidden');
        }
        // Clear error on input
        requesterNameInput.addEventListener('input', function() {
            this.classList.remove('border-red-500');
            if (requesterNameError) {
                requesterNameError.classList.add('hidden');
            }
        }, { once: true });
    }

    // Store data for submission
    modal.dataset.moduleCode = moduleData.code;
    modal.dataset.moduleTitle = moduleData.title;
    modal.dataset.moduleYear = moduleData.year;
    modal.dataset.field = field;
    modal.dataset.oldValue = oldValue;
    modal.dataset.newValue = newValue;

    // Show modal
    modal.classList.remove('hidden');
}

// Confirm and send module change notification
async function confirmModuleChange() {
    const modal = document.getElementById('moduleChangeConfirmModal');
    const confirmBtn = document.getElementById('confirm-change-btn');
    const requesterNameInput = document.getElementById('confirm-requester-name');
    const requesterNameError = document.getElementById('requester-name-error');

    if (!modal) return;

    // Validate requester name
    const requesterName = requesterNameInput ? requesterNameInput.value.trim() : '';
    if (!requesterName) {
        if (requesterNameInput) {
            requesterNameInput.classList.add('border-red-500');
            requesterNameInput.focus();
        }
        if (requesterNameError) {
            requesterNameError.classList.remove('hidden');
        }
        return;
    }

    // Get stored data
    const moduleData = {
        code: modal.dataset.moduleCode,
        title: modal.dataset.moduleTitle,
        year: modal.dataset.moduleYear
    };
    const field = modal.dataset.field;
    const oldValue = modal.dataset.oldValue;
    const newValue = modal.dataset.newValue;

    // Disable button and show loading state
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Sending...';
    lucide.createIcons();

    // Save requester name to localStorage for future use
    localStorage.setItem('moduleChangeRequesterName', requesterName);

    try {
        const response = await axios.post(`${CONSTANTS.API_ENDPOINTS.base}/notify-module-change`, {
            moduleData,
            field,
            oldValue,
            newValue,
            requesterName
        });

        if (response.data.success) {
            // Determine notification message based on email status
            let notificationMessage = 'Change saved successfully!';
            let notificationType = 'success';

            if (response.data.emailSent) {
                notificationMessage = 'Change saved and notification email sent!';
            } else {
                // Email failed but change was saved
                if (response.data.emailConfigured === false) {
                    notificationMessage = 'Change saved (email service not configured)';
                } else {
                    notificationMessage = 'Change saved (email notification failed)';
                }
                notificationType = 'warning';
                console.warn('Email notification failed:', response.data.emailError);
            }

            showNotification(notificationMessage, notificationType);
            closeModuleChangeConfirmation();

            // Update the original value so the Submit button disappears
            if (field === 'Semester') {
                const semesterSelect = document.getElementById('edit-semester');
                const semesterSubmitBtn = document.getElementById('submit-semester-change');
                if (semesterSelect && semesterSubmitBtn) {
                    semesterSelect.dataset.originalValue = newValue;
                    semesterSubmitBtn.style.display = 'none';
                }
            } else if (field === 'Module Lead') {
                const moduleLeadInput = document.getElementById('edit-module-lead');
                const leadSubmitBtn = document.getElementById('submit-lead-change');
                if (moduleLeadInput && leadSubmitBtn) {
                    moduleLeadInput.dataset.originalValue = newValue;
                    leadSubmitBtn.style.display = 'none';
                }
            }
        } else {
            showNotification('Failed to save change: ' + (response.data.message || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error sending module change notification:', error);
        const errorMessage = error.response?.data?.error || error.message || 'Failed to send notification';
        showNotification('Error: ' + errorMessage, 'error');
    } finally {
        // Re-enable button
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = 'Confirm Change';
    }
}

// Close module change confirmation modal
function closeModuleChangeConfirmation() {
    const modal = document.getElementById('moduleChangeConfirmModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Stats tracking
function updateStats() {
    // Total programmes
    const totalProgrammes = Object.keys(progAutocompleteData).length;
    const progStatElement = document.getElementById('stat-total-programmes');
    if (progStatElement) {
        progStatElement.textContent = totalProgrammes.toLocaleString();
    }
    // Also update Overview tab card
    const progStatElementOverview = document.getElementById('stat-total-programmes-overview');
    if (progStatElementOverview) {
        progStatElementOverview.textContent = totalProgrammes.toLocaleString();
    }

    // Total modules
    const totalModules = Object.keys(modAutocompleteData).length;
    const modStatElement = document.getElementById('stat-total-modules');
    if (modStatElement) {
        modStatElement.textContent = totalModules.toLocaleString();
    }
    // Also update Overview tab card
    const modStatElementOverview = document.getElementById('stat-total-modules-overview');
    if (modStatElementOverview) {
        modStatElementOverview.textContent = totalModules.toLocaleString();
    }

    // Generated today
    const generatedToday = getGeneratedToday();
    const genTodayElement = document.getElementById('stat-generated-today');
    if (genTodayElement) {
        genTodayElement.textContent = generatedToday;
    }

    // Recent updates (last 7 days)
    const recentUpdates = getRecentUpdatesCount();
    const recentElement = document.getElementById('stat-recent-updates');
    if (recentElement) {
        recentElement.textContent = recentUpdates;
    }
}

// Get count of specifications generated today
function getGeneratedToday() {
    try {
        const data = localStorage.getItem(CONSTANTS.STORAGE_KEYS.GENERATED_TODAY);
        if (!data) return 0;

        const generated = JSON.parse(data);
        const today = new Date().toDateString();

        // Filter for today's date
        return generated.filter(item => new Date(item.timestamp).toDateString() === today).length;
    } catch (error) {
        console.error('Error reading generated today:', error);
        return 0;
    }
}

// Track a generated specification
function trackGenerated(type, code) {
    try {
        let data = localStorage.getItem(CONSTANTS.STORAGE_KEYS.GENERATED_TODAY);
        let generated = data ? JSON.parse(data) : [];

        // Add new entry
        generated.push({
            type,
            code,
            timestamp: new Date().toISOString()
        });

        // Keep only last 100 entries
        if (generated.length > 100) {
            generated = generated.slice(-100);
        }

        localStorage.setItem(CONSTANTS.STORAGE_KEYS.GENERATED_TODAY, JSON.stringify(generated));
        updateStats();
    } catch (error) {
        console.error('Error tracking generated spec:', error);
    }
}

// Get count of recent updates (last 7 days)
function getRecentUpdatesCount() {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        let count = 0;

        // Count recent programmes
        count += recentProgrammes.filter(item =>
            new Date(item.timestamp) > sevenDaysAgo
        ).length;

        // Count recent modules
        count += recentModules.filter(item =>
            new Date(item.timestamp) > sevenDaysAgo
        ).length;

        return count;
    } catch (error) {
        console.error('Error calculating recent updates:', error);
        return 0;
    }
}

// Chart instances
let moduleChart = null;
let moduleCreditsChart = null;
let activityChart = null;
let schoolChart = null;
let degreeTypesChart = null;
let progCollegeChart = null;
let progCampusChart = null;

// Initialize charts
async function initializeCharts() {
    console.log('=== Initializing Charts ===');

    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js library not loaded');
        return;
    }

    // Check data availability
    console.log('Data availability:', {
        programmes: progAutocompleteData ? Object.keys(progAutocompleteData).length : 0,
        modules: modAutocompleteData ? Object.keys(modAutocompleteData).length : 0,
        chartJsVersion: Chart.version
    });

    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#E5E7EB' : '#374151';
    const gridColor = isDark ? '#374151' : '#E5E7EB';

    console.log('Theme:', isDark ? 'dark' : 'light');

    Chart.defaults.color = textColor;
    Chart.defaults.borderColor = gridColor;

    // Only load Overview tab charts initially (lazy loading for other tabs)
    console.log('Loading Overview tab charts (initial load)...');

    // Small delay to ensure Alpine.js has initialized and elements are visible
    await new Promise(resolve => setTimeout(resolve, 100));

    createActivityChart();
    loadedTabs.overview = true;

    console.log('=== Chart Initialization Complete ===');
    console.log('Other tabs will load their charts when clicked (lazy loading)');
}

// Chart skeleton helper functions
function showChartSkeleton(chartId) {
    const skeleton = document.getElementById(`${chartId}-skeleton`);
    if (skeleton) {
        skeleton.classList.remove('hidden');
    }
}

function hideChartSkeleton(chartId) {
    const skeleton = document.getElementById(`${chartId}-skeleton`);
    if (skeleton) {
        skeleton.classList.add('hidden');
    }
}

// Create module distribution chart (by level)
async function createModuleDistributionChart() {
    try {
        // Show skeleton loading state
        showChartSkeleton('moduleChart');

        // Get canvas element
        const canvas = document.getElementById('moduleChart');
        if (!canvas) {
            console.error('Module chart canvas not found');
            hideChartSkeleton('moduleChart');
            return;
        }

        // Get 2D rendering context
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Could not get 2D context from module chart canvas');
            hideChartSkeleton('moduleChart');
            return;
        }

        console.log('Fetching module level distribution data...');

        // Fetch level distribution from API
        const response = await axios.get('/mod-level-distribution');
        const levelCounts = response.data;

        console.log('Received level distribution:', levelCounts);

        // Validate we have data to display
        if (!levelCounts || Object.keys(levelCounts).length === 0) {
            console.warn('No level data received from server. Chart will not be created.');
            hideChartSkeleton('moduleChart');
            return;
        }

        const labels = Object.keys(levelCounts).sort();
        const data = labels.map(level => levelCounts[level]);
        const colors = [
            '#FCD34D', // Yellow for C
            '#60A5FA', // Blue for I
            '#34D399', // Green for H
            '#F87171', // Red for M
            '#A78BFA', // Purple
            '#FB923C'  // Orange
        ];

        console.log('Module distribution:', levelCounts);

        if (moduleChart) {
            moduleChart.destroy();
        }

        moduleChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: document.documentElement.classList.contains('dark') ? '#1F2937' : '#FFFFFF'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

        console.log('Module distribution chart created successfully');

        // Hide skeleton after chart is rendered
        hideChartSkeleton('moduleChart');
    } catch (error) {
        console.error('Error creating module distribution chart:', error);
        hideChartSkeleton('moduleChart');
    }
}

// Create module credits distribution chart
async function createModuleCreditsChart(selectedLevel = '', selectedCollege = '') {
    try {
        // Show skeleton loading state
        showChartSkeleton('creditsChart');

        // Get canvas element
        const canvas = document.getElementById('creditsChart');
        if (!canvas) {
            console.error('Credits chart canvas not found');
            hideChartSkeleton('creditsChart');
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Could not get 2D context from credits chart canvas');
            hideChartSkeleton('creditsChart');
            return;
        }

        console.log('Fetching module credits distribution data...', { level: selectedLevel, college: selectedCollege });

        // Build query params
        const params = new URLSearchParams();
        if (selectedLevel) params.append('level', selectedLevel);
        if (selectedCollege) params.append('college', selectedCollege);

        // Fetch credits distribution from API
        const response = await axios.get(`/mod-credits-distribution?${params.toString()}`);
        const creditsData = response.data;

        console.log('Received credits distribution:', creditsData);

        // Validate we have data to display
        if (!creditsData || Object.keys(creditsData).length === 0) {
            console.warn('No credits data received from server. Chart will not be created.');
            // Show empty state or destroy existing chart
            if (moduleCreditsChart) {
                moduleCreditsChart.destroy();
                moduleCreditsChart = null;
            }
            hideChartSkeleton('creditsChart');
            return;
        }

        // Sort by credit value ascending
        const labels = Object.keys(creditsData).sort((a, b) => parseInt(a) - parseInt(b));
        const data = labels.map(credits => creditsData[credits]);

        // Destroy existing chart
        if (moduleCreditsChart) {
            moduleCreditsChart.destroy();
        }

        // Create column chart
        moduleCreditsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels.map(c => `${c} credits`),
                datasets: [{
                    label: 'Number of Modules',
                    data: data,
                    backgroundColor: '#7916FF',
                    borderColor: '#7916FF',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'x', // Vertical columns
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y || 0;
                                return `${value} modules`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        },
                        grid: {
                            color: document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB'
                        }
                    }
                }
            }
        });

        console.log('Module credits distribution chart created successfully');

        // Hide skeleton after chart is rendered
        hideChartSkeleton('creditsChart');
    } catch (error) {
        console.error('Error creating module credits distribution chart:', error);
        hideChartSkeleton('creditsChart');
    }
}

// Update credits chart when filters change
window.updateCreditsChart = function() {
    const modulesTab = document.getElementById('modules-tab');
    if (modulesTab && modulesTab._x_dataStack && modulesTab._x_dataStack[0]) {
        const data = modulesTab._x_dataStack[0];
        createModuleCreditsChart(data.creditSelectedLevel, data.creditSelectedCollege);
    }
};

// Create activity chart (last 7 days)
function createActivityChart() {
    try {
        // Show skeleton loading state
        showChartSkeleton('activityChart');

        // Get canvas element
        const canvas = document.getElementById('activityChart');
        if (!canvas) {
            console.error('Activity chart canvas not found');
            hideChartSkeleton('activityChart');
            return;
        }

        // Get 2D rendering context
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Could not get 2D context from activity chart canvas');
            hideChartSkeleton('activityChart');
            return;
        }

        console.log('Creating activity chart for last 7 days');

        // Get last 7 days
        const days = [];
        const programmeCounts = [];
        const moduleCounts = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();

            days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

            // Count generations for this day
            try {
                const data = localStorage.getItem(CONSTANTS.STORAGE_KEYS.GENERATED_TODAY);
                if (data) {
                    const generated = JSON.parse(data);
                    const dayGenerations = generated.filter(item =>
                        new Date(item.timestamp).toDateString() === dateStr
                    );

                    programmeCounts.push(dayGenerations.filter(item => item.type === 'programme').length);
                    moduleCounts.push(dayGenerations.filter(item => item.type === 'module').length);
                } else {
                    programmeCounts.push(0);
                    moduleCounts.push(0);
                }
            } catch (error) {
                programmeCounts.push(0);
                moduleCounts.push(0);
            }
        }

        const totalActivity = programmeCounts.reduce((a, b) => a + b, 0) + moduleCounts.reduce((a, b) => a + b, 0);
        console.log('Activity data:', {
            totalActivity,
            programmes: programmeCounts.reduce((a, b) => a + b, 0),
            modules: moduleCounts.reduce((a, b) => a + b, 0)
        });

        if (activityChart) {
            activityChart.destroy();
        }

        activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: days,
            datasets: [
                {
                    label: 'Programmes',
                    data: programmeCounts,
                    borderColor: '#7916FF',
                    backgroundColor: 'rgba(121, 22, 255, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Modules',
                    data: moduleCounts,
                    borderColor: '#34D399',
                    backgroundColor: 'rgba(52, 211, 153, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        },
                        usePointStyle: true
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    },
                    grid: {
                        color: document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });

        console.log('Activity chart created successfully');

        // Hide skeleton after chart is rendered
        hideChartSkeleton('activityChart');
    } catch (error) {
        console.error('Error creating activity chart:', error);
        hideChartSkeleton('activityChart');
    }
}

// Create school activity chart (top 10 schools by module count)
async function createSchoolActivityChart(selectedColleges = []) {
    try {
        // Show skeleton loading state
        showChartSkeleton('schoolChart');

        console.log('=== Creating School Activity Chart ===');
        console.log('Selected colleges:', selectedColleges);

        // Get canvas element
        const canvas = document.getElementById('schoolChart');
        if (!canvas) {
            console.error('❌ School chart canvas not found');
            hideChartSkeleton('schoolChart');
            return;
        }
        console.log('✓ Canvas element found');

        // Get 2D rendering context
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('❌ Could not get 2D context from school chart canvas');
            hideChartSkeleton('schoolChart');
            return;
        }
        console.log('✓ 2D context obtained');

        // Build query string with college filter
        let url = '/school-activity';
        if (selectedColleges && selectedColleges.length > 0) {
            url += `?colleges=${encodeURIComponent(selectedColleges.join(','))}`;
        }

        console.log(`Fetching school activity data from ${url}...`);

        // Fetch school activity from API
        const response = await axios.get(url);
        const schoolCounts = response.data;

        console.log('✓ Received school activity data:', schoolCounts);

        // Validate we have data to display
        if (!schoolCounts || Object.keys(schoolCounts).length === 0) {
            console.warn('⚠️ No school activity data received from server. Chart will not be created.');
            hideChartSkeleton('schoolChart');
            return;
        }

        const labels = Object.keys(schoolCounts);
        const data = labels.map(school => schoolCounts[school]);

        console.log(`Creating chart with ${labels.length} schools`);

        if (schoolChart) {
            schoolChart.destroy();
        }

        schoolChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Modules',
                    data: data,
                    backgroundColor: '#7916FF',
                    borderColor: '#7916FF',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y', // Horizontal bar chart
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.parsed.x} modules`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        },
                        grid: {
                            color: document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB'
                        }
                    },
                    y: {
                        ticks: {
                            autoSkip: false, // Show all labels
                            font: {
                                size: 11 // Slightly smaller for better fit
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                layout: {
                    padding: {
                        left: 10 // Extra padding for long labels
                    }
                }
            }
        });

        console.log('✅ School activity chart created successfully');

        // Hide skeleton after chart is rendered
        hideChartSkeleton('schoolChart');
    } catch (error) {
        console.error('❌ Error creating school activity chart:', error);
        console.error('Error details:', error.stack);
        hideChartSkeleton('schoolChart');
    }
}

// Create degree types chart (programme distribution by qualification)
async function createDegreeTypesChart(level = 'all') {
    try {
        // Show skeleton loading state
        showChartSkeleton('degreeTypesChart');

        console.log('=== Creating Degree Types Chart ===');
        console.log('Level filter:', level);

        // Get canvas element
        const canvas = document.getElementById('degreeTypesChart');
        if (!canvas) {
            console.error('❌ Degree types chart canvas not found');
            hideChartSkeleton('degreeTypesChart');
            return;
        }
        console.log('✓ Canvas element found');

        // Get 2D rendering context
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('❌ Could not get 2D context from degree types chart canvas');
            hideChartSkeleton('degreeTypesChart');
            return;
        }
        console.log('✓ 2D context obtained');

        // Build query string with level filter
        let url = '/programme-degree-types';
        if (level && level !== 'all') {
            url += `?level=${level}`;
        }

        console.log(`Fetching programme degree types data from ${url}...`);

        // Fetch degree types from API
        const response = await axios.get(url);
        const degreeTypeCounts = response.data;

        console.log('✓ Received degree types data:', degreeTypeCounts);

        // Validate we have data to display
        if (!degreeTypeCounts || Object.keys(degreeTypeCounts).length === 0) {
            console.warn('⚠️ No degree types data received from server. Chart will not be created.');
            hideChartSkeleton('degreeTypesChart');
            return;
        }

        const labels = Object.keys(degreeTypeCounts);
        const data = labels.map(degreeType => degreeTypeCounts[degreeType]);

        console.log(`Creating chart with ${labels.length} degree types (top 15)`);

        // Generate colors for each degree type
        const colors = [
            '#7916FF', '#34D399', '#60A5FA', '#F87171', '#FCD34D',
            '#A78BFA', '#FB923C', '#EC4899', '#10B981', '#3B82F6',
            '#EF4444', '#F59E0B', '#8B5CF6', '#06B6D4', '#14B8A6'
        ];

        if (degreeTypesChart) {
            degreeTypesChart.destroy();
        }

        degreeTypesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Programmes',
                    data: data,
                    backgroundColor: colors,
                    borderColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y', // Horizontal bar chart
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.parsed.x} programmes`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        },
                        grid: {
                            color: document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB'
                        }
                    },
                    y: {
                        ticks: {
                            autoSkip: false, // Show all labels
                            font: {
                                size: 11 // Slightly smaller for better fit
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                layout: {
                    padding: {
                        left: 10 // Extra padding for long labels
                    }
                }
            }
        });

        console.log('✅ Degree types chart created successfully');

        // Hide skeleton after chart is rendered
        hideChartSkeleton('degreeTypesChart');
    } catch (error) {
        console.error('❌ Error creating degree types chart:', error);
        console.error('Error details:', error.stack);
        hideChartSkeleton('degreeTypesChart');
    }
}

// Create programme college distribution chart
async function createProgCollegeChart() {
    try {
        // Show skeleton loading state
        showChartSkeleton('progCollegeChart');

        console.log('=== Creating Programme College Chart ===');

        // Get canvas element
        const canvas = document.getElementById('progCollegeChart');
        if (!canvas) {
            console.error('❌ Programme college chart canvas not found');
            hideChartSkeleton('progCollegeChart');
            return;
        }
        console.log('✓ Canvas element found');

        // Get 2D rendering context
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('❌ Could not get 2D context from programme college chart canvas');
            hideChartSkeleton('progCollegeChart');
            return;
        }
        console.log('✓ 2D context obtained');

        console.log('Fetching programme college distribution data...');

        // Fetch college distribution from API
        const response = await axios.get('/prog-college-distribution');
        const collegeCounts = response.data;

        console.log('✓ Received college distribution data:', collegeCounts);

        // Validate we have data to display
        if (!collegeCounts || Object.keys(collegeCounts).length === 0) {
            console.warn('⚠️ No college distribution data received from server. Chart will not be created.');
            hideChartSkeleton('progCollegeChart');
            return;
        }

        const labels = Object.keys(collegeCounts);
        const data = labels.map(college => collegeCounts[college]);

        console.log(`Creating chart with ${labels.length} colleges`);

        if (progCollegeChart) {
            progCollegeChart.destroy();
        }

        progCollegeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Programmes',
                    data: data,
                    backgroundColor: '#7916FF',
                    borderColor: '#7916FF',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y', // Horizontal bar chart
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.parsed.x} programmes`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        },
                        grid: {
                            color: document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB'
                        }
                    },
                    y: {
                        ticks: {
                            autoSkip: false,
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                layout: {
                    padding: {
                        left: 10
                    }
                }
            }
        });

        console.log('✅ Programme college chart created successfully');

        // Hide skeleton after chart is rendered
        hideChartSkeleton('progCollegeChart');
    } catch (error) {
        console.error('❌ Error creating programme college chart:', error);
        console.error('Error details:', error.stack);
        hideChartSkeleton('progCollegeChart');
    }
}

// Create programme campus distribution chart
async function createProgCampusChart() {
    try {
        // Show skeleton loading state
        showChartSkeleton('progCampusChart');

        console.log('=== Creating Programme Campus Chart ===');

        // Get canvas element
        const canvas = document.getElementById('progCampusChart');
        if (!canvas) {
            console.error('❌ Programme campus chart canvas not found');
            hideChartSkeleton('progCampusChart');
            return;
        }
        console.log('✓ Canvas element found');

        // Get 2D rendering context
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('❌ Could not get 2D context from programme campus chart canvas');
            hideChartSkeleton('progCampusChart');
            return;
        }
        console.log('✓ 2D context obtained');

        console.log('Fetching programme campus distribution data...');

        // Fetch campus distribution from API
        const response = await axios.get('/prog-campus-distribution');
        const campusCounts = response.data;

        console.log('✓ Received campus distribution data:', campusCounts);

        // Validate we have data to display
        if (!campusCounts || Object.keys(campusCounts).length === 0) {
            console.warn('⚠️ No campus distribution data received from server. Chart will not be created.');
            hideChartSkeleton('progCampusChart');
            return;
        }

        const labels = Object.keys(campusCounts);
        const data = labels.map(campus => campusCounts[campus]);
        const colors = [
            '#7916FF', // Purple
            '#34D399', // Green
            '#60A5FA', // Blue
            '#F87171', // Red
            '#FCD34D', // Yellow
            '#A78BFA', // Light purple
            '#FB923C', // Orange
            '#EC4899', // Pink
            '#10B981', // Emerald
            '#3B82F6'  // Sky blue
        ];

        console.log(`Creating doughnut chart with ${labels.length} campuses`);

        if (progCampusChart) {
            progCampusChart.destroy();
        }

        progCampusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: document.documentElement.classList.contains('dark') ? '#1F2937' : '#FFFFFF'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });

        console.log('✅ Programme campus chart created successfully');

        // Hide skeleton after chart is rendered
        hideChartSkeleton('progCampusChart');
    } catch (error) {
        console.error('❌ Error creating programme campus chart:', error);
        console.error('Error details:', error.stack);
        hideChartSkeleton('progCampusChart');
    }
}

// ========================================
// USAGE ANALYTICS FUNCTIONS
// ========================================

// Chart instances for cleanup
let monthlyTrendChart = null;
let collegeUsageChart = null;
let schoolUsageChart = null;
let topSpecsChart = null;

// Load summary statistics for Usage tab
async function loadUsageSummaryStats() {
    try {
        const response = await axios.get('/usage-stats');
        const stats = response.data;

        document.getElementById('total-all-time').textContent = stats.totalAllTime.toLocaleString();
        document.getElementById('last-30-days').textContent = stats.last30Days.toLocaleString();
        document.getElementById('last-7-days').textContent = stats.last7Days.toLocaleString();
        document.getElementById('prog-mod-ratio').textContent =
            `${stats.byType.programmes}/${stats.byType.modules}`;
    } catch (error) {
        console.error('Error loading usage stats:', error);
        document.getElementById('total-all-time').textContent = 'Error';
        document.getElementById('last-30-days').textContent = 'Error';
        document.getElementById('last-7-days').textContent = 'Error';
        document.getElementById('prog-mod-ratio').textContent = 'Error';
    }
}

// Create monthly trend line chart
async function createMonthlyTrendChart() {
    try {
        // Show skeleton loading state
        showChartSkeleton('monthlyTrendChart');

        console.log('=== Creating Monthly Trend Chart ===');
        const canvas = document.getElementById('monthlyTrendChart');
        if (!canvas) {
            console.error('Monthly trend chart canvas not found!');
            hideChartSkeleton('monthlyTrendChart');
            return;
        }

        const ctx = canvas.getContext('2d');

        // Get filters from Alpine.js state
        const usageTab = document.getElementById('usage-tab');
        const filters = usageTab ? Alpine.$data(usageTab) : {};
        console.log('Monthly trend filters:', filters);

        // Build query string
        let url = '/usage-by-month?';
        if (filters.usageType && filters.usageType !== 'all') {
            url += `type=${filters.usageType}&`;
        }
        if (filters.selectedCollege) {
            url += `college=${encodeURIComponent(filters.selectedCollege)}&`;
        }
        if (filters.selectedSchool) {
            url += `school=${encodeURIComponent(filters.selectedSchool)}&`;
        }

        // Show all historical data (no date range limit)
        console.log('Monthly trend URL:', url);

        const response = await axios.get(url);
        const monthlyData = response.data;
        console.log('Monthly trend data received:', monthlyData);

        const labels = monthlyData.map(item => item.month);
        const data = monthlyData.map(item => item.count);
        console.log('Monthly trend labels:', labels);
        console.log('Monthly trend values:', data);

        if (monthlyTrendChart) monthlyTrendChart.destroy();

        monthlyTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Specs Generated',
                    data,
                    borderColor: '#7916FF',
                    backgroundColor: 'rgba(121, 22, 255, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: { color: '#666' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#666' }
                    },
                    x: {
                        ticks: { color: '#666' }
                    }
                }
            }
        });

        // Hide skeleton after chart is rendered
        hideChartSkeleton('monthlyTrendChart');
    } catch (error) {
        console.error('Error creating monthly trend chart:', error);
        hideChartSkeleton('monthlyTrendChart');
    }
}

// Create college usage bar chart
async function createCollegeUsageChart() {
    try {
        // Show skeleton loading state
        showChartSkeleton('collegeUsageChart');

        console.log('=== Creating College Usage Chart ===');
        const canvas = document.getElementById('collegeUsageChart');
        if (!canvas) {
            console.error('College chart canvas not found!');
            hideChartSkeleton('collegeUsageChart');
            return;
        }

        const ctx = canvas.getContext('2d');

        // Get filters
        const usageTab = document.getElementById('usage-tab');
        const filters = usageTab ? Alpine.$data(usageTab) : {};
        console.log('College chart filters:', filters);

        let url = '/usage-by-college?';
        if (filters.usageType && filters.usageType !== 'all') {
            url += `type=${filters.usageType}&`;
        }
        console.log('College chart URL:', url);

        const response = await axios.get(url);
        const collegeCounts = response.data;
        console.log('College chart data received:', collegeCounts);

        const labels = Object.keys(collegeCounts);
        const data = labels.map(college => collegeCounts[college]);
        console.log('College chart labels:', labels);
        console.log('College chart values:', data);

        if (collegeUsageChart) collegeUsageChart.destroy();

        collegeUsageChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Specs',
                    data,
                    backgroundColor: '#7916FF'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        ticks: {
                            autoSkip: false,
                            font: { size: 11 },
                            color: '#666'
                        }
                    },
                    x: {
                        beginAtZero: true,
                        ticks: { color: '#666' }
                    }
                }
            }
        });

        // Hide skeleton after chart is rendered
        hideChartSkeleton('collegeUsageChart');
    } catch (error) {
        console.error('Error creating college usage chart:', error);
        hideChartSkeleton('collegeUsageChart');
    }
}

// Create school usage bar chart
async function createSchoolUsageChart() {
    try {
        // Show skeleton loading state
        showChartSkeleton('schoolUsageChart');

        console.log('=== Creating School Usage Chart ===');
        const canvas = document.getElementById('schoolUsageChart');
        if (!canvas) {
            console.error('School chart canvas not found!');
            hideChartSkeleton('schoolUsageChart');
            return;
        }

        const ctx = canvas.getContext('2d');

        // Get filters
        const usageTab = document.getElementById('usage-tab');
        const filters = usageTab ? Alpine.$data(usageTab) : {};
        console.log('School chart filters:', filters);

        let url = '/usage-by-school?limit=10&';
        if (filters.usageType && filters.usageType !== 'all') {
            url += `type=${filters.usageType}&`;
        }
        if (filters.selectedCollege) {
            url += `college=${encodeURIComponent(filters.selectedCollege)}&`;
        }
        console.log('School chart URL:', url);

        const response = await axios.get(url);
        const schoolCounts = response.data;
        console.log('School chart data received:', schoolCounts);

        const labels = Object.keys(schoolCounts);
        const data = labels.map(school => schoolCounts[school]);
        console.log('School chart labels:', labels);
        console.log('School chart values:', data);

        if (schoolUsageChart) schoolUsageChart.destroy();

        schoolUsageChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Specs',
                    data,
                    backgroundColor: '#10B981'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        ticks: {
                            autoSkip: false,
                            font: { size: 11 },
                            color: '#666'
                        }
                    },
                    x: {
                        beginAtZero: true,
                        ticks: { color: '#666' }
                    }
                }
            }
        });

        // Hide skeleton after chart is rendered
        hideChartSkeleton('schoolUsageChart');
    } catch (error) {
        console.error('Error creating school usage chart:', error);
        hideChartSkeleton('schoolUsageChart');
    }
}

// Create top specs bar chart
async function createTopSpecsChart() {
    try {
        const canvas = document.getElementById('topSpecsChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Get filters
        const usageTab = document.getElementById('usage-tab');
        const filters = usageTab ? Alpine.$data(usageTab) : {};

        let url = '/top-specs?limit=20&';
        if (filters.usageType && filters.usageType !== 'all') {
            url += `type=${filters.usageType}&`;
        }

        const response = await axios.get(url);
        const topSpecs = response.data;

        const labels = topSpecs.map(spec => `${spec.code} - ${spec.title.substring(0, 40)}${spec.title.length > 40 ? '...' : ''}`);
        const data = topSpecs.map(spec => spec.count);
        const colors = topSpecs.map(spec => spec.type === 'prog' ? '#3B82F6' : '#F59E0B');

        if (topSpecsChart) topSpecsChart.destroy();

        topSpecsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Times Generated',
                    data,
                    backgroundColor: colors
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: (context) => {
                                const spec = topSpecs[context[0].dataIndex];
                                return `${spec.code} - ${spec.title}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            autoSkip: false,
                            font: { size: 10 },
                            color: '#666'
                        }
                    },
                    x: {
                        beginAtZero: true,
                        ticks: { color: '#666' }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating top specs chart:', error);
    }
}

// Update all usage charts when filters change
window.updateUsageCharts = async function() {
    console.log('Updating usage charts with new filters...');
    await createMonthlyTrendChart();
    await createCollegeUsageChart();
    await createSchoolUsageChart();
    await createTopSpecsChart();
};

// Real-time filter update handlers
window.updateSchoolChart = function() {
    // Get selected colleges from the Modules tab Alpine.js state
    const modulesTab = document.getElementById('modules-tab');
    if (!modulesTab) return;

    // Access Alpine.js data
    const selectedColleges = Alpine.$data(modulesTab).selectedColleges || [];

    console.log('Updating school chart with colleges:', selectedColleges);

    // Re-create chart with new filter
    createSchoolActivityChart(selectedColleges);
};

window.updateDegreeTypesChart = function() {
    // Get selected level from the Programmes tab Alpine.js state
    const programmesTab = document.getElementById('programmes-tab');
    if (!programmesTab) return;

    // Access Alpine.js data
    const degreeLevel = Alpine.$data(programmesTab).degreeLevel || 'all';

    console.log('Updating degree types chart with level:', degreeLevel);

    // Re-create chart with new filter
    createDegreeTypesChart(degreeLevel);
};

// Track which tabs have been loaded (for lazy loading)
const loadedTabs = {
    modules: false,
    programmes: false,
    usage: false
};

// Switch analytics tab with lazy loading
window.switchAnalyticsTab = async function(tabName) {
    console.log(`Switching to ${tabName} tab`);

    // If tab is already loaded, nothing to do
    if (loadedTabs[tabName]) {
        console.log(`${tabName} tab already loaded`);
        return;
    }

    // Load charts for the selected tab
    try {
        switch(tabName) {
            case 'modules':
                console.log('Loading modules tab charts...');

                // Load module distribution chart
                await createModuleDistributionChart();

                // Load college list for filter from programme options (modules don't have college field)
                const modulesTab = document.getElementById('modules-tab');
                if (modulesTab) {
                    try {
                        const filterResponse = await axios.get('/filter-options/programmes');
                        const colleges = filterResponse.data.colleges || [];
                        Alpine.$data(modulesTab).allColleges = colleges;
                        console.log(`Loaded ${colleges.length} colleges for filter`);
                    } catch (error) {
                        console.error('Error loading colleges:', error);
                    }
                }

                // Load credits distribution chart (no filter initially)
                await createModuleCreditsChart();

                // Load school activity chart (no filter initially)
                await createSchoolActivityChart([]);

                loadedTabs.modules = true;
                break;

            case 'programmes':
                console.log('Loading programmes tab charts...');

                // Load college distribution chart
                await createProgCollegeChart();

                // Load campus distribution chart
                await createProgCampusChart();

                // Load degree types chart
                await createDegreeTypesChart('all');

                loadedTabs.programmes = true;
                break;

            case 'usage':
                console.log('Loading usage tab charts and stats...');

                // Load filter options
                const usageTab = document.getElementById('usage-tab');
                if (usageTab) {
                    try {
                        const filterResponse = await axios.get('/filter-options/programmes');
                        Alpine.$data(usageTab).allColleges = filterResponse.data.colleges || [];
                        console.log('Loaded colleges for filter:', Alpine.$data(usageTab).allColleges.length);
                    } catch (error) {
                        console.error('Error loading filter options:', error);
                    }

                    try {
                        const filterResponse = await axios.get('/filter-options/modules');
                        Alpine.$data(usageTab).allSchools = filterResponse.data.schools || [];
                        console.log('Loaded schools for filter:', Alpine.$data(usageTab).allSchools.length);
                    } catch (error) {
                        console.error('Error loading filter options:', error);
                    }
                }

                // Load summary stats and charts
                console.log('Loading summary stats...');
                await loadUsageSummaryStats();
                console.log('Loading monthly trend chart...');
                await createMonthlyTrendChart();
                console.log('Loading college usage chart...');
                await createCollegeUsageChart();
                console.log('Loading school usage chart...');
                await createSchoolUsageChart();
                console.log('Loading activity chart...');
                createActivityChart();
                console.log('✓ All usage tab charts loaded');

                loadedTabs.usage = true;
                break;

            default:
                console.warn(`Unknown tab: ${tabName}`);
        }
    } catch (error) {
        console.error(`Error loading ${tabName} tab:`, error);
    }
};

// Refresh charts
window.refreshCharts = function() {
    // Reset loaded tabs state
    loadedTabs.overview = false;
    loadedTabs.modules = false;
    loadedTabs.programmes = false;
    loadedTabs.usage = false;

    // Reinitialize charts
    initializeCharts();
    showNotification('Charts refreshed!', 'success');
};

// Toggle charts visibility (placeholder for expand feature)
window.toggleCharts = function() {
    const section = document.getElementById('analytics-section');
    if (section) {
        section.classList.toggle('lg:grid-cols-1');
        section.classList.toggle('lg:grid-cols-2');
        setTimeout(() => {
            if (moduleChart) moduleChart.resize();
            if (activityChart) activityChart.resize();
            if (schoolChart) schoolChart.resize();
            if (degreeTypesChart) degreeTypesChart.resize();
        }, 300);
    }
};

// ============================================================================
// CHART DEBUGGING HELPERS
// ============================================================================

/**
 * Debug function to check chart status
 * Usage: Call debugCharts() from browser console
 */
window.debugCharts = function() {
    console.log('=== CHART DEBUG INFO ===');

    console.log('1. Chart.js Library:');
    console.log('   - Loaded:', typeof Chart !== 'undefined');
    if (typeof Chart !== 'undefined') {
        console.log('   - Version:', Chart.version);
    }

    console.log('\n2. Canvas Elements:');
    const moduleCanvas = document.getElementById('moduleChart');
    const activityCanvas = document.getElementById('activityChart');
    console.log('   - Module Chart Canvas:', moduleCanvas ? 'Found' : 'NOT FOUND');
    if (moduleCanvas) {
        console.log('     - Width:', moduleCanvas.width, 'Height:', moduleCanvas.height);
        console.log('     - Has 2D Context:', moduleCanvas.getContext('2d') ? 'Yes' : 'No');
    }
    console.log('   - Activity Chart Canvas:', activityCanvas ? 'Found' : 'NOT FOUND');
    if (activityCanvas) {
        console.log('     - Width:', activityCanvas.width, 'Height:', activityCanvas.height);
        console.log('     - Has 2D Context:', activityCanvas.getContext('2d') ? 'Yes' : 'No');
    }

    console.log('\n3. Chart Instances:');
    console.log('   - Module Chart:', moduleChart ? 'Initialized' : 'NOT INITIALIZED');
    console.log('   - Activity Chart:', activityChart ? 'Initialized' : 'NOT INITIALIZED');

    console.log('\n4. Data Sources:');
    console.log('   - Programme Data:', progAutocompleteData ? Object.keys(progAutocompleteData).length + ' items' : 'NOT LOADED');
    console.log('   - Module Data:', modAutocompleteData ? Object.keys(modAutocompleteData).length + ' items' : 'NOT LOADED');

    console.log('\n5. LocalStorage:');
    try {
        const generatedData = localStorage.getItem(CONSTANTS.STORAGE_KEYS.GENERATED_TODAY);
        if (generatedData) {
            const parsed = JSON.parse(generatedData);
            console.log('   - Generated Today:', parsed.length + ' items');
        } else {
            console.log('   - Generated Today: No data');
        }
    } catch (error) {
        console.log('   - Generated Today: Error reading', error.message);
    }

    console.log('\n6. Theme:');
    const isDark = document.documentElement.classList.contains('dark');
    console.log('   - Current Theme:', isDark ? 'Dark' : 'Light');

    console.log('\n=== END DEBUG INFO ===');
    console.log('\nTo manually reinitialize charts, run: initializeCharts()');
};

/**
 * Force chart reinitialization
 * Usage: Call forceChartRefresh() from browser console
 */
window.forceChartRefresh = function() {
    console.log('Force refreshing charts...');

    // Destroy existing charts
    if (moduleChart) {
        console.log('Destroying module chart...');
        moduleChart.destroy();
        moduleChart = null;
    }
    if (activityChart) {
        console.log('Destroying activity chart...');
        activityChart.destroy();
        activityChart = null;
    }

    // Reinitialize
    initializeCharts();
    console.log('Charts reinitialized');
};


// ============================================================================
// ADVANCED FILTERING SYSTEM
// ============================================================================

// Filter state
let moduleFilterOptions = null;
let programmeFilterOptions = null;
let schoolToCollegeMapping = null; // School-to-college mapping for cascading filters
// Mapping from full degree names to abbreviations used in programme titles
const DEGREE_TYPE_MAPPING = {
    "Bachelor of Arts": "BA",
    "Bachelor of Science": "BSc",
    "Master of Arts": "MA",
    "Master of Science": "MSc",
    "Master of Business Administration": "MBA",
    "Master of Engineering": "MEng",
    "Master of Philosophy": "MPhil",
    "Master of Research": "MRes",
    "Doctor of Philosophy": "PhD",
    "Postgraduate Certificate": "PGCert",
    "Postgraduate Diploma": "PGDip",
    "Bachelor of Engineering": "BEng",
    "Bachelor of Medicine Bachelor of Surgery": "MBChB",
    "Bachelor of Dental Surgery": "BDS",
    "Bachelor of Laws": "LLB",
    "Master of Laws": "LLM",
    "Master of Public Health": "MPH",
    "Master of Education": "MEd",
    "Bachelor of Music": "BMus",
    "Doctor of Medicine": "MD",
    "Doctor of Dental Surgery": "DDS",
    "Foundation Degree": "FD",
    "Higher National Certificate": "HNC",
    "Higher National Diploma": "HND",
    "Certificate of Higher Education": "CertHE",
    "Diploma of Higher Education": "DipHE"
};

let activeFilters = {
    modules: {
        levels: [],
        semesters: [],
        schools: [],
        colleges: []
    },
    programmes: {
        levels: [],
        colleges: [],
        schools: [],
        campuses: [],
        modes: [],
        degreeTypes: []
    }
};

// Load filter options from API
async function loadFilterOptions() {
    try {
        const [modResponse, progResponse, mappingResponse] = await Promise.all([
            axios.get('/filter-options/modules'),
            axios.get('/filter-options/programmes'),
            axios.get('/school-college-mapping')
        ]);

        moduleFilterOptions = modResponse.data;
        programmeFilterOptions = progResponse.data;
        schoolToCollegeMapping = mappingResponse.data.mapping;

        console.log('Filter options loaded:', { moduleFilterOptions, programmeFilterOptions, schoolToCollegeMapping });

        // Populate filter UI
        populateModuleFilters();
        populateProgrammeFilters();

        // Load saved filters from localStorage
        loadSavedFilters();
    } catch (error) {
        console.error('Error loading filter options:', error);
    }
}

/**
 * Update dependent filter options based on current selections
 * @param {string} type - 'modules' or 'programmes'
 */
function updateDependentFilters(type) {
    if (!schoolToCollegeMapping) return;

    const filters = activeFilters[type];
    const options = type === 'modules' ? moduleFilterOptions : programmeFilterOptions;

    // Get currently selected colleges and schools
    const selectedColleges = filters.colleges || [];
    const selectedSchools = filters.schools || [];

    // Calculate available schools based on selected colleges
    let availableSchools = options.schools || [];
    if (selectedColleges.length > 0) {
        availableSchools = availableSchools.filter(school => {
            const schoolCollege = schoolToCollegeMapping[school];
            return schoolCollege && selectedColleges.includes(schoolCollege);
        });
    }

    // Calculate available colleges based on selected schools
    let availableColleges = options.colleges || [];
    if (selectedSchools.length > 0) {
        const collegesWithSelectedSchools = new Set();
        selectedSchools.forEach(school => {
            const college = schoolToCollegeMapping[school];
            if (college) collegesWithSelectedSchools.add(college);
        });
        availableColleges = availableColleges.filter(college =>
            collegesWithSelectedSchools.has(college)
        );
    }

    // Update the UI
    if (type === 'modules') {
        updateFilterCheckboxes('mod-college-filters', availableColleges, selectedColleges);
        updateFilterCheckboxes('mod-school-filters', availableSchools, selectedSchools);
    } else {
        updateFilterCheckboxes('prog-college-filters', availableColleges, selectedColleges);
        updateFilterCheckboxes('prog-school-filters', availableSchools, selectedSchools);
    }
}

/**
 * Update filter checkboxes to show only available options
 * @param {string} containerId - ID of the container element
 * @param {Array} availableOptions - Options that should be enabled
 * @param {Array} selectedOptions - Options that are currently selected
 */
function updateFilterCheckboxes(containerId, availableOptions, selectedOptions) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        const value = cb.value;
        const isAvailable = availableOptions.includes(value);
        const isSelected = selectedOptions.includes(value);

        // Disable checkboxes that aren't available (unless they're selected)
        cb.disabled = !isAvailable && !isSelected;

        // Add visual styling for disabled state
        const label = cb.closest('label');
        if (label) {
            if (cb.disabled) {
                label.classList.add('opacity-40', 'cursor-not-allowed');
                label.classList.remove('cursor-pointer', 'hover:bg-gray-50', 'dark:hover:bg-gray-700');
            } else {
                label.classList.remove('opacity-40', 'cursor-not-allowed');
                label.classList.add('cursor-pointer', 'hover:bg-gray-50', 'dark:hover:bg-gray-700');
            }
        }
    });
}

// Populate module filter UI
function populateModuleFilters() {
    if (!moduleFilterOptions) return;

    // Level filters
    const levelContainer = document.getElementById('mod-level-filters');
    if (levelContainer && moduleFilterOptions.levels) {
        levelContainer.innerHTML = moduleFilterOptions.levels.map(level => `
            <label class="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded transition-colors">
                <input type="checkbox" value="${level}"
                       onchange="toggleModuleFilter('levels', '${level}')"
                       class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700">
                <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Level ${level}</span>
            </label>
        `).join('');
    }

    // Semester filters
    const semesterContainer = document.getElementById('mod-semester-filters');
    if (semesterContainer && moduleFilterOptions.semesters) {
        semesterContainer.innerHTML = moduleFilterOptions.semesters.map(semester => `
            <label class="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded transition-colors">
                <input type="checkbox" value="${semester}"
                       onchange="toggleModuleFilter('semesters', '${semester}')"
                       class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700">
                <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">${semester}</span>
            </label>
        `).join('');
    }

    // School dropdown
    // College checkboxes
    const collegeContainer = document.getElementById('mod-college-filters');
    if (collegeContainer && moduleFilterOptions.colleges) {
        collegeContainer.innerHTML = moduleFilterOptions.colleges.map(college => `
            <label class="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded transition-colors">
                <input type="checkbox" value="${college}"
                       onchange="toggleModuleFilter('colleges', '${college.replace(/'/g, "\\'")}')"
                       class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700">
                <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">${college}</span>
            </label>
        `).join('');
    }

    // School checkboxes
    const schoolContainer = document.getElementById('mod-school-filters');
    if (schoolContainer && moduleFilterOptions.schools) {
        schoolContainer.innerHTML = moduleFilterOptions.schools.map(school => `
            <label class="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded transition-colors">
                <input type="checkbox" value="${school}"
                       onchange="toggleModuleFilter('schools', '${school.replace(/'/g, "\\'")}')"
                       class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700">
                <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">${school}</span>
            </label>
        `).join('');
    }
}

// Populate programme filter UI
function populateProgrammeFilters() {
    if (!programmeFilterOptions) return;

    // Level checkboxes
    const levelContainer = document.getElementById('prog-level-filters');
    if (levelContainer && programmeFilterOptions.levels) {
        levelContainer.innerHTML = programmeFilterOptions.levels.map(level => `
            <label class="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded transition-colors">
                <input type="checkbox" value="${level}"
                       onchange="toggleProgrammeFilter('levels', '${level}')"
                       class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700">
                <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">${level}</span>
            </label>
        `).join('');
    }

    // College checkboxes
    const collegeContainer = document.getElementById('prog-college-filters');
    if (collegeContainer && programmeFilterOptions.colleges) {
        collegeContainer.innerHTML = programmeFilterOptions.colleges.map(college => `
            <label class="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded transition-colors">
                <input type="checkbox" value="${college}"
                       onchange="toggleProgrammeFilter('colleges', '${college.replace(/'/g, "\\'")}')"
                       class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700">
                <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">${college}</span>
            </label>
        `).join('');
    }

    // School checkboxes
    const schoolContainer = document.getElementById('prog-school-filters');
    if (schoolContainer && programmeFilterOptions.schools) {
        schoolContainer.innerHTML = programmeFilterOptions.schools.map(school => `
            <label class="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded transition-colors">
                <input type="checkbox" value="${school}"
                       onchange="toggleProgrammeFilter('schools', '${school.replace(/'/g, "\\'")}')"
                       class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700">
                <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">${school}</span>
            </label>
        `).join('');
    }

    // Campus filters
    const campusContainer = document.getElementById('prog-campus-filters');
    if (campusContainer && programmeFilterOptions.campuses) {
        campusContainer.innerHTML = programmeFilterOptions.campuses.map(campus => `
            <label class="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded transition-colors">
                <input type="checkbox" value="${campus}"
                       onchange="toggleProgrammeFilter('campuses', '${campus}')"
                       class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700">
                <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">${campus}</span>
            </label>
        `).join('');
    }

    // Mode filters
    const modeContainer = document.getElementById('prog-mode-filters');
    if (modeContainer && programmeFilterOptions.modes) {
        modeContainer.innerHTML = programmeFilterOptions.modes.map(mode => `
            <label class="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded transition-colors">
                <input type="checkbox" value="${mode}"
                       onchange="toggleProgrammeFilter('modes', '${mode}')"
                       class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700">
                <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">${mode}</span>
            </label>
        `).join('');
    }

    // Degree Type dropdown
    const degreeSelect = document.getElementById('prog-degree-filter');
    if (degreeSelect && programmeFilterOptions.degreeTypes) {
        degreeSelect.innerHTML = '<option value="">All Degree Types</option>' +
            programmeFilterOptions.degreeTypes.map(degree => `
                <option value="${degree}">${degree}</option>
            `).join('');
        degreeSelect.onchange = () => {
            activeFilters.programmes.degreeTypes = degreeSelect.value ? [degreeSelect.value] : [];
        };
    }
}

// Toggle module filter
window.toggleModuleFilter = function(category, value) {
    const index = activeFilters.modules[category].indexOf(value);
    if (index > -1) {
        activeFilters.modules[category].splice(index, 1);
    } else {
        activeFilters.modules[category].push(value);
    }

    // Update dependent filters when college or school changes
    if (category === 'colleges' || category === 'schools') {
        updateDependentFilters('modules');
    }
};

// Toggle programme filter
window.toggleProgrammeFilter = function(category, value) {
    const index = activeFilters.programmes[category].indexOf(value);
    if (index > -1) {
        activeFilters.programmes[category].splice(index, 1);
    } else {
        activeFilters.programmes[category].push(value);
    }

    // Update dependent filters when college or school changes
    if (category === 'colleges' || category === 'schools') {
        updateDependentFilters('programmes');
    }
};

// Select All / Clear All functions for multi-select filters

// Select all colleges for modules
window.selectAllColleges = function(type) {
    const containerId = type === 'modules' ? 'mod-college-filters' : 'prog-college-filters';
    const container = document.getElementById(containerId);
    if (!container) return;

    const checkboxes = container.querySelectorAll('input[type="checkbox"]:not(:disabled)');
    checkboxes.forEach(cb => {
        cb.checked = true;
        const value = cb.value;
        if (!activeFilters[type].colleges.includes(value)) {
            activeFilters[type].colleges.push(value);
        }
    });

    console.log(`Selected all colleges for ${type}:`, activeFilters[type].colleges);
    updateDependentFilters(type);
};

// Clear all colleges for modules or programmes
window.clearAllColleges = function(type) {
    const containerId = type === 'modules' ? 'mod-college-filters' : 'prog-college-filters';
    const container = document.getElementById(containerId);
    if (!container) return;

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    activeFilters[type].colleges = [];

    console.log(`Cleared all colleges for ${type}`);
    updateDependentFilters(type);
};

// Select all schools for modules
window.selectAllSchools = function(type) {
    const containerId = type === 'modules' ? 'mod-school-filters' : 'prog-school-filters';
    const container = document.getElementById(containerId);
    if (!container) return;

    const checkboxes = container.querySelectorAll('input[type="checkbox"]:not(:disabled)');
    checkboxes.forEach(cb => {
        cb.checked = true;
        const value = cb.value;
        if (!activeFilters[type].schools.includes(value)) {
            activeFilters[type].schools.push(value);
        }
    });

    console.log(`Selected all schools for ${type}:`, activeFilters[type].schools);
    updateDependentFilters(type);
};

// Clear all schools for modules
window.clearAllSchools = function(type) {
    const containerId = type === 'modules' ? 'mod-school-filters' : 'prog-school-filters';
    const container = document.getElementById(containerId);
    if (!container) return;

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    activeFilters[type].schools = [];

    console.log(`Cleared all schools for ${type}`);
    updateDependentFilters(type);
};

// Select all levels for modules or programmes
window.selectAllLevels = function(type) {
    const containerId = type === 'modules' ? 'mod-level-filters' : 'prog-level-filters';
    const container = document.getElementById(containerId);
    if (!container) return;

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = true;
        const value = cb.value;
        if (!activeFilters[type].levels.includes(value)) {
            activeFilters[type].levels.push(value);
        }
    });

    console.log(`Selected all levels for ${type}:`, activeFilters[type].levels);
};

// Clear all levels for modules or programmes
window.clearAllLevels = function(type) {
    const containerId = type === 'modules' ? 'mod-level-filters' : 'prog-level-filters';
    const container = document.getElementById(containerId);
    if (!container) return;

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    activeFilters[type].levels = [];

    console.log(`Cleared all levels for ${type}`);
};

// Open/close filter panels with smooth slide animations
window.openModuleFilters = function() {
    const panel = document.getElementById('module-filter-panel');
    const overlay = document.getElementById('filter-overlay');

    // Show the panel and overlay
    panel.classList.remove('hidden');
    overlay.classList.remove('hidden');

    // Force a reflow to ensure transition works
    panel.offsetHeight;

    // Remove transform to slide in from right
    requestAnimationFrame(() => {
        panel.classList.remove('translate-x-full');
        overlay.classList.remove('opacity-0');
    });

    lucide.createIcons();

    // Focus first interactive element for accessibility
    setTimeout(() => {
        const firstInput = panel.querySelector('input, button, select');
        if (firstInput) firstInput.focus();
    }, 350);
};

window.closeModuleFilters = function() {
    const panel = document.getElementById('module-filter-panel');
    const overlay = document.getElementById('filter-overlay');

    // Add transform to slide out to the right
    panel.classList.add('translate-x-full');
    overlay.classList.add('opacity-0');

    // Hide after animation completes
    setTimeout(() => {
        panel.classList.add('hidden');
        overlay.classList.add('hidden');
    }, 300);
};

window.openProgrammeFilters = function() {
    const panel = document.getElementById('programme-filter-panel');
    const overlay = document.getElementById('filter-overlay');

    // Show the panel and overlay
    panel.classList.remove('hidden');
    overlay.classList.remove('hidden');

    // Force a reflow to ensure transition works
    panel.offsetHeight;

    // Remove transform to slide in from right
    requestAnimationFrame(() => {
        panel.classList.remove('translate-x-full');
        overlay.classList.remove('opacity-0');
    });

    lucide.createIcons();

    // Focus first interactive element for accessibility
    setTimeout(() => {
        const firstInput = panel.querySelector('input, button, select');
        if (firstInput) firstInput.focus();
    }, 350);
};

window.closeProgrammeFilters = function() {
    const panel = document.getElementById('programme-filter-panel');
    const overlay = document.getElementById('filter-overlay');

    // Add transform to slide out to the right
    panel.classList.add('translate-x-full');
    overlay.classList.add('opacity-0');

    // Hide after animation completes
    setTimeout(() => {
        panel.classList.add('hidden');
        overlay.classList.add('hidden');
    }, 300);
};

window.closeAllFilters = function() {
    closeModuleFilters();
    closeProgrammeFilters();
};

// Apply filters
window.applyModuleFilters = function() {
    console.log('🔵 applyModuleFilters called');
    console.log('Active filters:', JSON.stringify(activeFilters.modules, null, 2));

    updateActiveFilterBadges('modules');
    saveFiltersToLocalStorage();
    closeModuleFilters();
    showNotification('Filters applied', 'success');

    // Check which view is active - use catalogueState.type instead of Alpine's activeTab
    // If catalogue has been initialized, we're in catalogue view
    const isInCatalogueView = catalogueState && catalogueState.type === 'modules' && catalogueState.allData.length > 0;
    console.log('Is in catalogue view (modules)?', isInCatalogueView);
    console.log('Catalogue state:', catalogueState?.type, 'Items:', catalogueState?.allData?.length);

    if (isInCatalogueView) {
        console.log('✅ Catalogue view detected - applying filters');
        console.log('Catalogue state before:', catalogueState.type, 'Total items:', catalogueState.totalItems);

        // Catalogue view - apply filters and re-render
        applyCatalogueFiltersAndSort();
        renderCatalogue();
        updateCatalogueFilterBadges();

        console.log('Catalogue state after:', 'Filtered items:', catalogueState.filteredData?.length);
    } else {
        console.log('📄 Download specs view - triggering search');
        // Download specs view - trigger search update
        const searchInput = document.getElementById('mod-search');
        if (searchInput) {
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
};

window.applyProgrammeFilters = function() {
    console.log('🟢 applyProgrammeFilters called');
    console.log('Active filters:', JSON.stringify(activeFilters.programmes, null, 2));

    updateActiveFilterBadges('programmes');
    saveFiltersToLocalStorage();
    closeProgrammeFilters();
    showNotification('Filters applied', 'success');

    // Check which view is active - use catalogueState.type instead of Alpine's activeTab
    // If catalogue has been initialized, we're in catalogue view
    const isInCatalogueView = catalogueState && catalogueState.type === 'programmes' && catalogueState.allData.length > 0;
    console.log('Is in catalogue view (programmes)?', isInCatalogueView);
    console.log('Catalogue state:', catalogueState?.type, 'Items:', catalogueState?.allData?.length);

    if (isInCatalogueView) {
        console.log('✅ Catalogue view detected - applying filters');
        console.log('Catalogue state before:', catalogueState.type, 'Total items:', catalogueState.totalItems);

        // Catalogue view - apply filters and re-render
        applyCatalogueFiltersAndSort();
        renderCatalogue();
        updateCatalogueFilterBadges();

        console.log('Catalogue state after:', 'Filtered items:', catalogueState.filteredData?.length);
    } else {
        console.log('📄 Download specs view - triggering search');
        // Download specs view - trigger search update
        const searchInput = document.getElementById('prog-search');
        if (searchInput) {
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
};

// Clear filters
window.clearModuleFilters = function() {
    activeFilters.modules = {
        levels: [],
        credits: [],
        semesters: [],
        schools: [],
        colleges: []
    };

    // Reset checkboxes
    document.querySelectorAll('#module-filter-panel input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
        cb.disabled = false; // Re-enable all checkboxes

        // Remove disabled styling
        const label = cb.closest('label');
        if (label) {
            label.classList.remove('opacity-40', 'cursor-not-allowed');
            label.classList.add('cursor-pointer', 'hover:bg-gray-50', 'dark:hover:bg-gray-700');
        }
    });

    applyModuleFilters();
};

window.clearProgrammeFilters = function() {
    activeFilters.programmes = {
        levels: [],
        colleges: [],
        schools: [],
        campuses: [],
        modes: [],
        degreeTypes: []
    };

    // Reset checkboxes and selects
    document.querySelectorAll('#programme-filter-panel input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
        cb.disabled = false; // Re-enable all checkboxes

        // Remove disabled styling
        const label = cb.closest('label');
        if (label) {
            label.classList.remove('opacity-40', 'cursor-not-allowed');
            label.classList.add('cursor-pointer', 'hover:bg-gray-50', 'dark:hover:bg-gray-700');
        }
    });

    // Degree type dropdown still exists
    const degreeSelect = document.getElementById('prog-degree-filter');
    if (degreeSelect) degreeSelect.value = '';

    applyProgrammeFilters();
};

// Update active filter badges
function updateActiveFilterBadges(type) {
    const filters = type === 'modules' ? activeFilters.modules : activeFilters.programmes;
    const container = document.getElementById(type === 'modules' ? 'mod-active-filters' : 'prog-active-filters');
    const countBadge = document.getElementById(type === 'modules' ? 'mod-filter-count' : 'prog-filter-count');

    let badges = [];
    let totalCount = 0;

    // Build badge HTML for each active filter
    Object.entries(filters).forEach(([category, values]) => {
        if (Array.isArray(values) && values.length > 0) {
            values.forEach(value => {
                totalCount++;
                badges.push(`
                    <span class="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 text-sm rounded-full">
                        ${value}
                        <button onclick="removeFilter('${type}', '${category}', '${value}')"
                                class="hover:bg-primary-200 dark:hover:bg-primary-800 rounded-full p-0.5">
                            <i data-lucide="x" class="w-3 h-3"></i>
                        </button>
                    </span>
                `);
            });
        }
    });

    // Update UI
    if (totalCount > 0) {
        container.innerHTML = badges.join('');
        container.classList.remove('hidden');
        container.classList.add('flex');
        countBadge.textContent = totalCount;
        countBadge.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
        countBadge.classList.add('hidden');
    }

    lucide.createIcons();
}

// Remove individual filter
window.removeFilter = function(type, category, value) {
    const filters = type === 'modules' ? activeFilters.modules : activeFilters.programmes;
    const index = filters[category].indexOf(value);
    if (index > -1) {
        filters[category].splice(index, 1);
    }

    // Update checkbox state
    const checkbox = document.querySelector(`#${type === 'modules' ? 'module' : 'programme'}-filter-panel input[value="${value}"]`);
    if (checkbox) checkbox.checked = false;

    // Reapply filters
    if (type === 'modules') {
        applyModuleFilters();
    } else {
        applyProgrammeFilters();
    }
};

/**
 * Update active filter badges in catalogue view
 */
function updateCatalogueFilterBadges() {
    const type = catalogueState.type; // 'programmes' or 'modules'
    const filters = type === 'modules' ? activeFilters.modules : activeFilters.programmes;
    const container = document.getElementById('catalogue-active-filters');
    const countBadge = document.getElementById('catalogue-filter-count');

    if (!container) return;

    let badges = [];
    let totalCount = 0;

    // Build badge HTML for each active filter with category labels
    Object.entries(filters).forEach(([category, values]) => {
        if (Array.isArray(values) && values.length > 0) {
            values.forEach(value => {
                totalCount++;
                // Capitalize category for display
                const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1, -1); // Remove 's' from plural
                badges.push(`
                    <span class="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm rounded-lg">
                        <span class="font-medium">${categoryLabel}:</span>
                        <span>${value}</span>
                        <button onclick="removeCatalogueFilter('${category}', '${value}')"
                                class="ml-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-0.5 transition-colors"
                                aria-label="Remove ${value} filter">
                            <i data-lucide="x" class="w-3 h-3"></i>
                        </button>
                    </span>
                `);
            });
        }
    });

    // Update UI
    if (totalCount > 0) {
        container.innerHTML = badges.join('');
        container.classList.remove('hidden');
        container.classList.add('flex', 'flex-wrap', 'gap-2');
        if (countBadge) {
            countBadge.textContent = totalCount;
            countBadge.classList.remove('hidden');
        }
    } else {
        container.innerHTML = '';
        container.classList.add('hidden');
        container.classList.remove('flex', 'flex-wrap', 'gap-2');
        if (countBadge) {
            countBadge.classList.add('hidden');
        }
    }

    lucide.createIcons();
}

/**
 * Simple debounce utility
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Remove individual filter from catalogue view (internal implementation)
 */
function removeCatalogueFilterInternal(category, value) {
    const type = catalogueState.type; // 'programmes' or 'modules'
    const filters = type === 'modules' ? activeFilters.modules : activeFilters.programmes;

    // Remove from active filters
    const index = filters[category].indexOf(value);
    if (index > -1) {
        filters[category].splice(index, 1);
    }

    // Update checkbox state in filter panel
    const panelId = type === 'modules' ? 'module-filter-panel' : 'programme-filter-panel';
    const checkbox = document.querySelector(`#${panelId} input[value="${value}"]`);
    if (checkbox) checkbox.checked = false;

    // Save to localStorage
    saveFiltersToLocalStorage();

    // Reapply filters to catalogue
    applyCatalogueFiltersAndSort();
    renderCatalogue();

    // Update badges
    updateCatalogueFilterBadges();
}

/**
 * Remove individual filter from catalogue view (debounced)
 */
window.removeCatalogueFilter = debounce(removeCatalogueFilterInternal, 100);

// Save filters to localStorage
function saveFiltersToLocalStorage() {
    try {
        localStorage.setItem('activeFilters', JSON.stringify(activeFilters));
    } catch (error) {
        console.warn('Could not save filters to localStorage:', error);
    }
}

// Load saved filters
function loadSavedFilters() {
    try {
        const saved = localStorage.getItem('activeFilters');
        if (saved) {
            activeFilters = JSON.parse(saved);

            // Restore checkbox states
            Object.entries(activeFilters.modules).forEach(([category, values]) => {
                values.forEach(value => {
                    const checkbox = document.querySelector(`#module-filter-panel input[value="${value}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            });

            Object.entries(activeFilters.programmes).forEach(([category, values]) => {
                values.forEach(value => {
                    const checkbox = document.querySelector(`#programme-filter-panel input[value="${value}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            });

            // Update badges
            updateActiveFilterBadges('modules');
            updateActiveFilterBadges('programmes');
        }
    } catch (error) {
        console.warn('Could not load saved filters:', error);
    }
}

// Filter autocomplete data (to be called from setupAutocomplete)
window.applyFiltersToData = function(data, type) {
    if (!data || data.length === 0) return data;

    const filters = type === 'modules' ? activeFilters.modules : activeFilters.programmes;

    // Check if any filters are active
    const hasActiveFilters = Object.values(filters).some(arr => arr.length > 0);
    if (!hasActiveFilters) return data;

    return data.filter(item => {
        const itemLower = item.toLowerCase();

        // Module filtering logic
        if (type === 'modules') {
            // Extract module code from "CODE - Title (Campus)" format
            const parts = item.split(' - ');
            const code = parts[0];

            // Level filter - check if code starts with L + level letter
            if (filters.levels.length > 0) {
                const hasMatchingLevel = filters.levels.some(level =>
                    code.match(new RegExp(`^L?${level}`, 'i'))
                );
                if (!hasMatchingLevel) return false;
            }

            // Semester filter - check if semester info is in the string
            if (filters.semesters.length > 0) {
                const hasMatchingSemester = filters.semesters.some(semester =>
                    itemLower.includes(semester.toLowerCase())
                );
                if (!hasMatchingSemester) return false;
            }

            // School filter - check if school name is in the string
            if (filters.schools.length > 0) {
                const hasMatchingSchool = filters.schools.some(school =>
                    itemLower.includes(school.toLowerCase())
                );
                // If school info not in string, this will filter it out
                // This might be too restrictive for autocomplete strings
            }
        }

        // Programme filtering logic
        if (type === 'programmes') {
            // Format: "CODE - Degree Title Mode (Campus)"

            // Campus filter
            if (filters.campuses.length > 0) {
                const hasMatchingCampus = filters.campuses.some(campus =>
                    itemLower.includes(campus.toLowerCase())
                );
                if (!hasMatchingCampus) return false;
            }

            // Mode filter (FT, PT)
            if (filters.modes.length > 0) {
                const hasMatchingMode = filters.modes.some(mode =>
                    item.includes(mode) || itemLower.includes(mode.toLowerCase())
                );
                if (!hasMatchingMode) return false;
            }

            // Degree Type filter - map full names to abbreviations
            if (filters.degreeTypes.length > 0) {
                const hasMatchingDegree = filters.degreeTypes.some(fullDegreeName => {
                    // Get abbreviation from mapping, or use the value as-is if not in mapping
                    const abbreviation = DEGREE_TYPE_MAPPING[fullDegreeName] || fullDegreeName;
                    return item.includes(abbreviation);
                });
                if (!hasMatchingDegree) return false;
            }

            // College filter
            if (filters.colleges.length > 0) {
                const hasMatchingCollege = filters.colleges.some(college =>
                    itemLower.includes(college.toLowerCase())
                );
                // College might not be in autocomplete string, so be lenient
            }
        }

        return true;
    });
};

// Track if charts have been initialized
let chartsInitialized = false;

// Inline form validation
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    // Add error styling to field
    field.classList.add('border-red-500', 'dark:border-red-400');
    field.classList.remove('border-gray-300', 'dark:border-gray-600');

    // Remove existing error message if any
    const existingError = field.parentElement.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }

    // Create and insert error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error text-red-500 dark:text-red-400 text-sm mt-1 flex items-center space-x-1';
    errorDiv.innerHTML = `
        <i data-lucide="alert-circle" class="w-3 h-3"></i>
        <span>${message}</span>
    `;
    field.parentElement.appendChild(errorDiv);
    lucide.createIcons();
}

function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    // Remove error styling
    field.classList.remove('border-red-500', 'dark:border-red-400');
    field.classList.add('border-gray-300', 'dark:border-gray-600');

    // Remove error message
    const errorDiv = field.parentElement.querySelector('.field-error');
    if (errorDiv) {
        errorDiv.remove();
    }
}

function validateProgrammeForm() {
    let isValid = true;

    const progSearch = document.getElementById('prog-search');
    const yearSelect = document.getElementById('year-select');
    const cohortSelect = document.getElementById('cohort-select');

    // Clear all previous errors
    clearFieldError('prog-search');
    clearFieldError('year-select');
    clearFieldError('cohort-select');

    // Validate search input
    if (!progSearch || !progSearch.value.trim()) {
        showFieldError('prog-search', 'Please select a programme from the list');
        isValid = false;
    }

    // Validate year
    if (!yearSelect || !yearSelect.value) {
        showFieldError('year-select', 'Please select an academic year');
        isValid = false;
    }

    // Validate cohort type
    if (!cohortSelect || !cohortSelect.value) {
        showFieldError('cohort-select', 'Please select a spec type');
        isValid = false;
    }

    return isValid;
}

function validateModuleForm() {
    let isValid = true;

    const modSearch = document.getElementById('mod-search');
    const modYearSelect = document.getElementById('mod-year-select');

    // Clear all previous errors
    clearFieldError('mod-search');
    clearFieldError('mod-year-select');

    // Validate search input
    if (!modSearch || !modSearch.value.trim()) {
        showFieldError('mod-search', 'Please select a module from the list');
        isValid = false;
    }

    // Validate year
    if (!modYearSelect || !modYearSelect.value) {
        showFieldError('mod-year-select', 'Please select an academic year');
        isValid = false;
    }

    return isValid;
}

// Add ripple effect to buttons
function addRippleEffect() {
    document.querySelectorAll('.ripple-container').forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');

            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';

            this.appendChild(ripple);

            // Remove ripple after animation completes
            setTimeout(() => ripple.remove(), 600);
        });
    });
}

// Apply smart defaults and restore user preferences
function applySmartDefaults() {
    const PREFS_KEY = 'user_preferences';

    // Get current academic year (Sept-Aug cycle)
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-11
    const currentYear = now.getFullYear();
    // If we're in Sept-Dec, use current year. If Jan-Aug, use previous year.
    const academicYear = currentMonth >= 8 ? currentYear : currentYear - 1;
    const defaultYear = String(academicYear);

    // Try to load saved preferences
    let savedPrefs = {};
    try {
        const saved = localStorage.getItem(PREFS_KEY);
        if (saved) {
            savedPrefs = JSON.parse(saved);
        }
    } catch (error) {
        console.error('Error loading preferences:', error);
    }

    // Apply defaults to programme tab
    const yearSelect = document.getElementById('year-select');
    const cohortSelect = document.getElementById('cohort-select');

    if (yearSelect) {
        // Use saved preference or default to current academic year
        const savedYear = savedPrefs.programmeYear || defaultYear;
        if (yearSelect.querySelector(`option[value="${savedYear}"]`)) {
            yearSelect.value = savedYear;
        } else {
            yearSelect.value = defaultYear;
        }

        // Save when changed
        yearSelect.addEventListener('change', () => {
            savedPrefs.programmeYear = yearSelect.value;
            try {
                localStorage.setItem(PREFS_KEY, JSON.stringify(savedPrefs));
            } catch (error) {
                console.error('Error saving preference:', error);
            }
        });
    }

    if (cohortSelect) {
        // Restore saved cohort type
        if (savedPrefs.cohortType) {
            cohortSelect.value = savedPrefs.cohortType;
        }

        // Save when changed
        cohortSelect.addEventListener('change', () => {
            savedPrefs.cohortType = cohortSelect.value;
            try {
                localStorage.setItem(PREFS_KEY, JSON.stringify(savedPrefs));
            } catch (error) {
                console.error('Error saving preference:', error);
            }
        });
    }

    // Apply defaults to module tab
    const modYearSelect = document.getElementById('mod-year-select');

    if (modYearSelect) {
        // Use saved preference or default to current academic year
        const savedModYear = savedPrefs.moduleYear || defaultYear;
        if (modYearSelect.querySelector(`option[value="${savedModYear}"]`)) {
            modYearSelect.value = savedModYear;
        } else {
            modYearSelect.value = defaultYear;
        }

        // Save when changed
        modYearSelect.addEventListener('change', () => {
            savedPrefs.moduleYear = modYearSelect.value;
            try {
                localStorage.setItem(PREFS_KEY, JSON.stringify(savedPrefs));
            } catch (error) {
                console.error('Error saving preference:', error);
            }
        });
    }

    console.log('✓ Smart defaults applied');
}

// Initialize on page load
/**
 * Control empty state visibility for programmes and modules
 */
function updateEmptyStates() {
    const progSearch = document.getElementById('prog-search');
    const modSearch = document.getElementById('mod-search');
    const progEmptyState = document.getElementById('prog-empty-state');
    const modEmptyState = document.getElementById('mod-empty-state');

    // Show/hide programme empty state based on whether search has a value
    if (progEmptyState) {
        if (progSearch && progSearch.value.trim()) {
            progEmptyState.classList.add('hidden');
        } else {
            progEmptyState.classList.remove('hidden');
        }
    }

    // Show/hide module empty state based on whether search has a value
    if (modEmptyState) {
        if (modSearch && modSearch.value.trim()) {
            modEmptyState.classList.add('hidden');
        } else {
            modEmptyState.classList.remove('hidden');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 DOMContentLoaded fired');
    // Attach all event listeners once DOM is ready
    attachEventListeners();

    // Apply smart defaults
    applySmartDefaults();

    // Load the default (usage) tab
    switchAnalyticsTab('usage');

    // Add ripple effects to buttons
    addRippleEffect();

    // Setup validation error clearing on input
    const progSearch = document.getElementById('prog-search');
    const yearSelect = document.getElementById('year-select');
    const cohortSelect = document.getElementById('cohort-select');
    const modSearch = document.getElementById('mod-search');
    const modYearSelect = document.getElementById('mod-year-select');

    if (progSearch) progSearch.addEventListener('input', () => clearFieldError('prog-search'));
    if (yearSelect) yearSelect.addEventListener('change', () => clearFieldError('year-select'));
    if (cohortSelect) cohortSelect.addEventListener('change', () => clearFieldError('cohort-select'));
    if (modSearch) modSearch.addEventListener('input', () => clearFieldError('mod-search'));
    if (modYearSelect) modYearSelect.addEventListener('change', () => clearFieldError('mod-year-select'));

    // Setup empty state visibility management
    if (progSearch) {
        progSearch.addEventListener('input', updateEmptyStates);
        // Also hide when selecting from autocomplete
        progSearch.addEventListener('change', updateEmptyStates);
    }
    if (modSearch) {
        modSearch.addEventListener('input', updateEmptyStates);
        // Also hide when selecting from autocomplete
        modSearch.addEventListener('change', updateEmptyStates);
    }

    // Show empty states initially (on page load before any search)
    updateEmptyStates();

    initializeAutocomplete().then(() => {
        updateStats();
        // Charts will be lazily initialized when Analytics tab is clicked
    });

    // Setup lazy chart initialization for Analytics tab
    setupAnalyticsTabListener();

    // Load filter options
    loadFilterOptions();
});

/**
 * Setup listener for Analytics tab to lazily initialize charts
 */
function setupAnalyticsTabListener() {
    // Find all tab buttons
    const analyticsTabButton = document.querySelector('[\\@click*="analytics"]');

    if (analyticsTabButton) {
        analyticsTabButton.addEventListener('click', function() {
            // Initialize charts only once, when Analytics tab is first viewed
            if (!chartsInitialized) {
                console.log('Analytics tab opened for first time - initializing charts...');
                chartsInitialized = true;

                // Small delay to ensure tab content is visible
                setTimeout(() => {
                    initializeCharts();
                }, 100);
            }
        });

        console.log('Analytics tab lazy loading configured');
    } else {
        console.warn('Analytics tab button not found - charts will not be initialized');
    }
}

/**
 * Toggle accordion section visibility
 * @param {string} sectionId - The ID of the section to toggle
 */
window.toggleSection = function(sectionId, event) {
    // Stop event propagation to prevent card collapse
    if (event) {
        event.stopPropagation();
    }

    const content = document.getElementById(`${sectionId}-content`);
    const icon = document.getElementById(`${sectionId}-icon`);
    const button = document.querySelector(`[aria-controls="${sectionId}-content"]`);

    if (!content) return;

    const isHidden = content.classList.contains('hidden');

    if (isHidden) {
        // Show with smooth animation
        content.classList.remove('hidden');
        content.style.opacity = '0';
        content.style.transform = 'translateY(-10px)';

        // Update ARIA state
        if (button) button.setAttribute('aria-expanded', 'true');

        // Trigger animation
        requestAnimationFrame(() => {
            content.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
            content.style.opacity = '1';
            content.style.transform = 'translateY(0)';
        });

        if (icon) {
            icon.style.transition = 'transform 0.3s ease-out';
            icon.style.transform = 'rotate(90deg)';
        }
    } else {
        // Hide with smooth animation
        content.style.transition = 'opacity 0.2s ease-in, transform 0.2s ease-in';
        content.style.opacity = '0';
        content.style.transform = 'translateY(-10px)';

        // Update ARIA state
        if (button) button.setAttribute('aria-expanded', 'false');

        // Wait for animation to complete before hiding
        setTimeout(() => {
            content.classList.add('hidden');
            content.style.opacity = '';
            content.style.transform = '';
        }, 200);

        if (icon) {
            icon.style.transition = 'transform 0.3s ease-out';
            icon.style.transform = 'rotate(0deg)';
        }
    }
};

/**
 * Expand all collapsible sections in the preview modal
 */
window.expandAllSections = function() {
    // Find all collapsible content sections
    const allSections = document.querySelectorAll('[id$="-content"]');
    const allIcons = document.querySelectorAll('[id$="-icon"]');

    allSections.forEach((section, index) => {
        if (section.classList.contains('hidden')) {
            // Stagger the animations for a cascading effect
            setTimeout(() => {
                section.classList.remove('hidden');
                section.style.opacity = '0';
                section.style.transform = 'translateY(-10px)';

                requestAnimationFrame(() => {
                    section.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                    section.style.opacity = '1';
                    section.style.transform = 'translateY(0)';
                });
            }, index * 50); // 50ms delay between each section
        }
    });

    allIcons.forEach((icon, index) => {
        setTimeout(() => {
            icon.style.transition = 'transform 0.3s ease-out';
            icon.style.transform = 'rotate(90deg)';
        }, index * 50);
    });

    // Re-initialize Lucide icons for newly visible content
    setTimeout(() => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }, allSections.length * 50 + 100);
};

/**
 * Collapse all collapsible sections in the preview modal
 */
window.collapseAllSections = function() {
    // Find all collapsible content sections
    const allSections = document.querySelectorAll('[id$="-content"]');
    const allIcons = document.querySelectorAll('[id$="-icon"]');

    allSections.forEach((section, index) => {
        if (!section.classList.contains('hidden')) {
            setTimeout(() => {
                section.style.transition = 'opacity 0.2s ease-in, transform 0.2s ease-in';
                section.style.opacity = '0';
                section.style.transform = 'translateY(-10px)';

                setTimeout(() => {
                    section.classList.add('hidden');
                    section.style.opacity = '';
                    section.style.transform = '';
                }, 200);
            }, index * 40);
        }
    });

    allIcons.forEach((icon, index) => {
        setTimeout(() => {
            icon.style.transition = 'transform 0.3s ease-out';
            icon.style.transform = 'rotate(0deg)';
        }, index * 40);
    });
};

/**
 * Toggle TOC sidebar visibility on mobile
 */
window.toggleTOC = function() {
    const tocSidebar = document.getElementById('tocSidebar');
    if (!tocSidebar) return;

    const isHidden = tocSidebar.classList.contains('hidden');

    if (isHidden) {
        tocSidebar.classList.remove('hidden');
        tocSidebar.classList.add('fixed', 'inset-y-0', 'left-0', 'z-30', 'w-64', 'shadow-xl');
    } else {
        tocSidebar.classList.add('hidden');
        tocSidebar.classList.remove('fixed', 'inset-y-0', 'left-0', 'z-30', 'shadow-xl');
    }

    // Re-initialize icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
};

/**
 * Generate Table of Contents based on content sections
 * @param {Array} sections - Array of section objects {id, title, icon}
 */
function generateTOC(sections) {
    const tocNav = document.getElementById('tocNav');
    if (!tocNav) return;

    const tocHTML = sections.map((section, index) => `
        <a href="#${section.id}"
           data-toc-link="${section.id}"
           onclick="scrollToSection('${section.id}', event)"
           class="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all duration-200 hover:bg-primary-50 dark:hover:bg-primary-900/30 text-gray-700 dark:text-gray-300 hover:text-primary-700 dark:hover:text-primary-300">
            ${section.icon ? `<i data-lucide="${section.icon}" class="w-4 h-4 flex-shrink-0"></i>` : ''}
            <span class="flex-1 truncate">${section.title}</span>
            <span class="text-xs text-gray-400">${index + 1}</span>
        </a>
    `).join('');

    tocNav.innerHTML = tocHTML;

    // Re-initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Setup scroll tracking
    setupScrollTracking(sections);
}

/**
 * Scroll to a specific section
 * @param {string} sectionId - The ID of the section to scroll to
 * @param {Event} event - The click event
 */
window.scrollToSection = function(sectionId, event) {
    if (event) event.preventDefault();

    const section = document.getElementById(sectionId);
    const previewContent = document.getElementById('previewContent');

    if (!section || !previewContent) return;

    // Calculate offset to account for any fixed headers
    const offset = 20;
    const sectionTop = section.offsetTop - offset;

    previewContent.scrollTo({
        top: sectionTop,
        behavior: 'smooth'
    });

    // Close mobile TOC after navigation
    if (window.innerWidth < 1024) {
        const tocSidebar = document.getElementById('tocSidebar');
        if (tocSidebar && !tocSidebar.classList.contains('hidden')) {
            toggleTOC();
        }
    }
};

/**
 * Setup scroll tracking to highlight current section in TOC
 * @param {Array} sections - Array of section objects
 */
function setupScrollTracking(sections) {
    const previewContent = document.getElementById('previewContent');
    const tocProgress = document.getElementById('tocProgress');

    if (!previewContent) return;

    // Define the scroll handler function
    const handleTOCScroll = function() {
        // Update progress bar
        const scrollPercentage = (previewContent.scrollTop / (previewContent.scrollHeight - previewContent.clientHeight)) * 100;
        if (tocProgress) {
            tocProgress.style.width = `${Math.min(scrollPercentage, 100)}%`;
        }

        // Find current section
        let currentSection = null;
        const scrollPosition = previewContent.scrollTop + 100; // Offset for better UX

        for (let i = sections.length - 1; i >= 0; i--) {
            const section = document.getElementById(sections[i].id);
            if (section && section.offsetTop <= scrollPosition) {
                currentSection = sections[i].id;
                break;
            }
        }

        // Update TOC highlighting
        const allLinks = document.querySelectorAll('[data-toc-link]');
        allLinks.forEach(link => {
            const linkSectionId = link.getAttribute('data-toc-link');
            if (linkSectionId === currentSection) {
                link.classList.add('bg-primary-100', 'dark:bg-primary-900/50', 'text-primary-700', 'dark:text-primary-300', 'font-medium');
                link.classList.remove('text-gray-700', 'dark:text-gray-300');
            } else {
                link.classList.remove('bg-primary-100', 'dark:bg-primary-900/50', 'text-primary-700', 'dark:text-primary-300', 'font-medium');
                link.classList.add('text-gray-700', 'dark:text-gray-300');
            }
        });
    };

    // Add scroll listener
    previewContent.addEventListener('scroll', handleTOCScroll, { passive: true });
}

// ========================================
// CATALOGUE FUNCTIONALITY
// ========================================

/**
 * Catalogue State Management
 */
window.catalogueState = {
    type: 'programmes', // 'programmes' or 'modules'
    currentPage: 1,
    itemsPerPage: 30,
    sortBy: 'title', // 'title' or 'code'
    sortOrder: 'asc', // 'asc' or 'desc'
    searchQuery: '',
    totalItems: 0,
    allData: [], // Full dataset
    filteredData: [], // After filters and search
    displayData: [], // Current page data
    isLoading: false,
    fuseInstance: null,
    expandedCardId: null, // Track which card is currently expanded
    selectedCohortType: 'cohort', // 'cohort' or 'term' for programme specs
    selectedProgrammeYear: '2025', // Academic year for programme specs
    selectedModuleYear: '2025', // Academic year for module specs

    // Bulk generation properties
    selectedItems: new Set(), // Set of selected item codes (prog/mod codes)
    selectionMode: false, // Boolean: is selection mode active?
    maxSelection: 25, // Maximum items that can be selected
    bulkGenerationInProgress: false, // Prevent duplicate bulk operations

    // Module selection from programme properties
    moduleSelectionMode: false, // Boolean: is module selection mode active?
    selectedModulesFromProgramme: new Map(), // Map of {moduleCode: {year, title, credits, level, semester, progCode}}
    moduleSelectionProgrammeCode: null // Which programme is currently being used for module selection
};

/**
 * Get color for college/school badge
 * @param {string} name - College or school name
 * @returns {object} - {bg: background color, text: text color, darkBg: dark mode bg}
 */
function getCollegeColor(name) {
    if (!name) {
        return {
            bg: 'bg-gray-100',
            text: 'text-gray-700',
            darkBg: 'dark:bg-gray-700',
            darkText: 'dark:text-gray-300'
        };
    }

    const nameLower = name.toLowerCase();

    // Engineering and Physical Sciences
    if (nameLower.includes('engineering') || nameLower.includes('physical sci')) {
        return {
            bg: 'bg-blue-100',
            text: 'text-blue-700',
            darkBg: 'dark:bg-blue-900/30',
            darkText: 'dark:text-blue-300'
        };
    }

    // Life and Environmental Sciences
    if (nameLower.includes('life') || nameLower.includes('env') || nameLower.includes('bioscience') || nameLower.includes('geog')) {
        return {
            bg: 'bg-green-100',
            text: 'text-green-700',
            darkBg: 'dark:bg-green-900/30',
            darkText: 'dark:text-green-300'
        };
    }

    // Social Sciences
    if (nameLower.includes('social') || nameLower.includes('business') || nameLower.includes('psychology') || nameLower.includes('education')) {
        return {
            bg: 'bg-orange-100',
            text: 'text-orange-700',
            darkBg: 'dark:bg-orange-900/30',
            darkText: 'dark:text-orange-300'
        };
    }

    // Arts and Law
    if (nameLower.includes('arts') || nameLower.includes('law') || nameLower.includes('humanities')) {
        return {
            bg: 'bg-purple-100',
            text: 'text-purple-700',
            darkBg: 'dark:bg-purple-900/30',
            darkText: 'dark:text-purple-300'
        };
    }

    // Medicine and Health
    if (nameLower.includes('medicine') && nameLower.includes('health')) {
        return {
            bg: 'bg-red-100',
            text: 'text-red-700',
            darkBg: 'dark:bg-red-900/30',
            darkText: 'dark:text-red-300'
        };
    }

    // Medicine and Dental Sciences
    if (nameLower.includes('medicine') || nameLower.includes('dental') || nameLower.includes('clinical')) {
        return {
            bg: 'bg-pink-100',
            text: 'text-pink-700',
            darkBg: 'dark:bg-pink-900/30',
            darkText: 'dark:text-pink-300'
        };
    }

    // Computer Science
    if (nameLower.includes('computer')) {
        return {
            bg: 'bg-indigo-100',
            text: 'text-indigo-700',
            darkBg: 'dark:bg-indigo-900/30',
            darkText: 'dark:text-indigo-300'
        };
    }

    // Corporate Services
    if (nameLower.includes('corporate')) {
        return {
            bg: 'bg-gray-100',
            text: 'text-gray-700',
            darkBg: 'dark:bg-gray-700',
            darkText: 'dark:text-gray-300'
        };
    }

    // Default
    return {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        darkBg: 'dark:bg-gray-700',
        darkText: 'dark:text-gray-300'
    };
}

/**
 * Initialize catalogue for a specific type (programmes or modules)
 */
window.initializeCatalogue = async function(type) {
    if (window.DEBUG) console.log(`Initializing catalogue for ${type}`);

    // Update state
    catalogueState.type = type;
    catalogueState.currentPage = 1;
    catalogueState.searchQuery = '';

    // Collapse any expanded card when switching types
    if (catalogueState.expandedCardId) {
        const expandedCard = document.getElementById(catalogueState.expandedCardId);
        if (expandedCard) {
            expandedCard.classList.remove('expanded');
        }
        catalogueState.expandedCardId = null;
    }

    // Update search placeholder
    const searchInput = document.getElementById('catalogue-search');
    if (searchInput) {
        searchInput.value = '';
        searchInput.placeholder = type === 'programmes' ? 'Search programmes by code or title...' : 'Search modules by code or title...';
    }

    // Show loading state
    showCatalogueLoading();

    try {
        // Load data based on type
        if (type === 'programmes') {
            await loadProgrammeCatalogueData();
        } else {
            await loadModuleCatalogueData();
        }

        // Apply initial filtering and sorting
        applyCatalogueFiltersAndSort();

        // Render the catalogue
        renderCatalogue();

        // Update filter badges to show any saved filters
        updateCatalogueFilterBadges();

        // Setup event handlers for card expansion (only once)
        if (!window._catalogueHandlersSetup) {
            setupCardExpansionHandlers();
            window._catalogueHandlersSetup = true;
        }

    } catch (error) {
        console.error('Error initializing catalogue:', error);
        showCatalogueError();
    }
};

/**
 * Load programme data for catalogue
 */
async function loadProgrammeCatalogueData() {
    try {
        // Get autocomplete data (contains all programmes)
        const autocompleteData = await fetch('/autocomplete-data').then(r => r.json());

        // Convert autocomplete data to array of objects
        const programmes = Object.keys(autocompleteData).map(key => {
            // Parse the autocomplete string format: "3041 - BSc Economics FT (Birmingham) [School] {College}"
            const match = key.match(/^([A-Z0-9]+)\s+-\s+(.+?)\s+([A-Z]{2})\s+\((.+?)\)(?:\s+\[(.+?)\])?(?:\s+\{(.+?)\})?$/);

            if (match) {
                const [, code, title, mode, campus, school, college] = match;
                return {
                    code: code.trim(),
                    title: title.trim(),
                    mode: mode.trim(),
                    campus: campus.trim(),
                    school: school ? school.trim() : '',
                    college: college ? college.trim() : '',
                    fullText: key // For search
                };
            }
            return null;
        }).filter(p => p !== null);

        catalogueState.allData = programmes;
        catalogueState.totalItems = programmes.length;

        console.log(`Loaded ${programmes.length} programmes`);

    } catch (error) {
        console.error('Error loading programme catalogue data:', error);
        throw error;
    }
}

/**
 * Load module data for catalogue
 */
async function loadModuleCatalogueData() {
    try {
        // Get autocomplete data (contains all modules)
        const autocompleteData = await fetch('/mod-autocomplete-data').then(r => r.json());

        // Convert autocomplete data to array of objects
        const modules = Object.keys(autocompleteData).map(key => {
            // Parse the autocomplete string format: "41822 - Introduction to Programming (Birmingham) - Semester 1 [School] {College} |20|"
            const match = key.match(/^([A-Z0-9\s]+?)\s+-\s+(.+?)\s+(?:\((.+?)\))?\s*-\s*(.+?)(?:\s+\[(.+?)\])?(?:\s+\{(.+?)\})?(?:\s+\|(.+?)\|)?$/);

            if (match) {
                const [, code, title, campus, semester, school, college, credits] = match;
                return {
                    code: code.trim(),
                    title: title.trim(),
                    campus: campus ? campus.trim() : 'Not specified',
                    semester: semester.trim(),
                    school: school ? school.trim() : '',
                    college: college ? college.trim() : '',
                    credits: credits ? credits.trim() : '20', // Extract credits from the string
                    fullText: key // For search
                };
            }
            return null;
        }).filter(m => m !== null);

        catalogueState.allData = modules;
        catalogueState.totalItems = modules.length;

        console.log(`Loaded ${modules.length} modules`);

    } catch (error) {
        console.error('Error loading module catalogue data:', error);
        throw error;
    }
}

/**
 * Apply filters and sorting to catalogue data
 */
function applyCatalogueFiltersAndSort() {
    let data = [...catalogueState.allData];

    // Apply search if query exists
    if (catalogueState.searchQuery && catalogueState.searchQuery.trim().length >= 2) {
        data = performCatalogueSearch(data, catalogueState.searchQuery);
    }

    // Apply filters from existing filter system
    if (catalogueState.type === 'programmes') {
        data = applyProgrammeCatalogueFilters(data);
    } else {
        data = applyModuleCatalogueFilters(data);
    }

    // Sort data
    data = sortCatalogueData(data, catalogueState.sortBy, catalogueState.sortOrder);

    catalogueState.filteredData = data;
    catalogueState.totalItems = data.length;

    // Reset to page 1 when filters/search change
    catalogueState.currentPage = 1;
}

/**
 * Perform fuzzy search on catalogue data
 */
function performCatalogueSearch(data, query) {
    // Use Fuse.js for fuzzy search
    if (!window.Fuse) {
        console.error('Fuse.js not loaded');
        return data.filter(item =>
            item.fullText.toLowerCase().includes(query.toLowerCase())
        );
    }

    const fuse = new Fuse(data, {
        keys: ['code', 'title', 'fullText'],
        threshold: 0.3,
        distance: 100
    });

    const results = fuse.search(query);
    return results.map(r => r.item);
}

/**
 * Helper function to categorize programme level from title
 */
function categorizeProgrammeLevel(title) {
    if (!title) return null;

    const titleLower = title.toLowerCase();

    // Undergraduate patterns
    if (titleLower.match(/\b(ba|bsc|beng|llb|bds|mbchb|bmsc|bmus|bphil|bnurs|foundation)\b/)) {
        return 'Undergraduate';
    }

    // Postgraduate Research patterns
    if (titleLower.match(/\b(phd|mphil|mres|edd|dengr|dmd|dpharm|dsw|ddiv|dsc|dprth)\b/)) {
        return 'Postgraduate Research';
    }

    // Postgraduate Taught patterns (Masters, PGCert, PGDip)
    if (titleLower.match(/\b(ma|msc|mba|meng|med|llm|mpharm|mph|mpa|mjur|pgce|pgcert|pgdip)\b/)) {
        return 'Postgraduate Taught';
    }

    return null;
}

/**
 * Apply programme-specific filters
 */
function applyProgrammeCatalogueFilters(data) {
    console.log('📊 applyProgrammeCatalogueFilters called with', data.length, 'items');
    const filters = activeFilters?.programmes;
    console.log('Programme filters:', filters);
    if (!filters) {
        console.log('⚠️ No filters found, returning all data');
        return data;
    }

    const filtered = data.filter(prog => {
        // Level filter
        if (filters.levels && filters.levels.length > 0) {
            const progLevel = categorizeProgrammeLevel(prog.title);
            if (!progLevel || !filters.levels.includes(progLevel)) {
                return false;
            }
        }

        // Campus filter
        if (filters.campuses && filters.campuses.length > 0) {
            if (!filters.campuses.some(campus => prog.campus.includes(campus))) {
                return false;
            }
        }

        // Mode filter
        if (filters.modes && filters.modes.length > 0) {
            if (!filters.modes.includes(prog.mode)) {
                return false;
            }
        }

        // College filter
        if (filters.colleges && filters.colleges.length > 0) {
            if (!prog.college || !filters.colleges.some(college => prog.college.includes(college))) {
                return false;
            }
        }

        // School filter
        if (filters.schools && filters.schools.length > 0) {
            if (!prog.school || !filters.schools.some(school => prog.school.includes(school))) {
                return false;
            }
        }

        // Degree Type filter - map full names to abbreviations
        if (filters.degreeTypes && filters.degreeTypes.length > 0) {
            if (!prog.title) return false;

            // Check if any selected degree type matches
            const hasMatchingDegree = filters.degreeTypes.some(fullDegreeName => {
                // Get abbreviation from mapping, or use the value as-is if not in mapping
                const abbreviation = DEGREE_TYPE_MAPPING[fullDegreeName] || fullDegreeName;
                return prog.title.includes(abbreviation);
            });

            if (!hasMatchingDegree) {
                return false;
            }
        }

        return true;
    });

    console.log('✅ Filtered programmes:', filtered.length, 'of', data.length);
    return filtered;
}

/**
 * Apply module-specific filters
 */
function applyModuleCatalogueFilters(data) {
    console.log('📊 applyModuleCatalogueFilters called with', data.length, 'items');
    const filters = activeFilters?.modules;
    console.log('Module filters:', filters);
    if (!filters) {
        console.log('⚠️ No filters found, returning all data');
        return data;
    }

    const filtered = data.filter(mod => {
        // Semester filter
        if (filters.semesters && filters.semesters.length > 0) {
            if (!filters.semesters.some(sem => mod.semester.includes(sem))) {
                return false;
            }
        }

        // School filter
        if (filters.schools && filters.schools.length > 0) {
            if (!mod.school || !filters.schools.some(school => mod.school.includes(school))) {
                return false;
            }
        }

        // Level filter
        if (filters.levels && filters.levels.length > 0) {
            // Module code first character indicates level (C/I/H/D/M)
            const moduleLevel = mod.code ? mod.code.charAt(0).toUpperCase() : '';
            if (!filters.levels.includes(moduleLevel)) {
                return false;
            }
        }

        // College filter
        if (filters.colleges && filters.colleges.length > 0) {
            if (!mod.college || !filters.colleges.some(college => mod.college.includes(college))) {
                return false;
            }
        }

        return true;
    });

    console.log('✅ Filtered modules:', filtered.length, 'of', data.length);
    return filtered;
}

/**
 * Sort catalogue data
 */
function sortCatalogueData(data, sortBy, sortOrder) {
    const sorted = [...data].sort((a, b) => {
        let aVal = sortBy === 'code' ? a.code : a.title;
        let bVal = sortBy === 'code' ? b.code : b.title;

        // Convert to lowercase for case-insensitive sorting
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();

        if (sortOrder === 'asc') {
            return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
            return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
    });

    return sorted;
}

/**
 * Update empty state message based on whether filters are active
 */
function updateEmptyStateMessage() {
    const emptyEl = document.getElementById('catalogue-empty');
    if (!emptyEl) return;

    // Check if any filters are active
    const filters = catalogueState.type === 'modules' ? activeFilters.modules : activeFilters.programmes;
    const hasActiveFilters = Object.values(filters).some(arr => arr && arr.length > 0);
    const hasSearchTerm = catalogueState.searchTerm && catalogueState.searchTerm.trim() !== '';

    // Get the empty state elements
    const titleEl = emptyEl.querySelector('h3');
    const messageEl = emptyEl.querySelector('p');
    const iconEl = emptyEl.querySelector('[data-lucide]');

    if (!titleEl || !messageEl || !iconEl) return;

    if (hasActiveFilters || hasSearchTerm) {
        // Filters/search are active but returned no results
        iconEl.setAttribute('data-lucide', 'search-x');
        titleEl.textContent = 'No results found';

        if (hasSearchTerm && hasActiveFilters) {
            messageEl.innerHTML = 'No items match your search and filters.<br>Try adjusting your search term or removing some filters.';
        } else if (hasSearchTerm) {
            messageEl.innerHTML = 'No items match your search term.<br>Try a different search query.';
        } else {
            messageEl.innerHTML = 'No items match your current filters.<br>Try removing some filters to see more results.';
        }
    } else {
        // No filters active and no data - shouldn't happen normally
        iconEl.setAttribute('data-lucide', 'folder-x');
        titleEl.textContent = 'No items available';
        messageEl.innerHTML = `No ${catalogueState.type} are currently available.`;
    }
}

/**
 * Render the catalogue grid
 */
function renderCatalogue() {
    // Calculate pagination
    const startIndex = (catalogueState.currentPage - 1) * catalogueState.itemsPerPage;
    const endIndex = startIndex + catalogueState.itemsPerPage;
    catalogueState.displayData = catalogueState.filteredData.slice(startIndex, endIndex);

    // Update result count
    updateCatalogueResultCount();

    // Render cards
    renderCatalogueCards();

    // Update pagination
    updateCataloguePagination();

    // Hide loading, show grid
    const loadingEl = document.getElementById('catalogue-loading');
    const gridEl = document.getElementById('catalogue-grid');
    const emptyEl = document.getElementById('catalogue-empty');
    const paginationEl = document.getElementById('catalogue-pagination');

    if (loadingEl) loadingEl.classList.add('hidden');

    if (catalogueState.displayData.length === 0) {
        // Update empty state message based on context
        updateEmptyStateMessage();

        // Show empty state
        if (gridEl) gridEl.classList.add('hidden');
        if (emptyEl) emptyEl.classList.remove('hidden');
        if (paginationEl) paginationEl.classList.add('hidden');
    } else {
        // Show grid
        if (gridEl) gridEl.classList.remove('hidden');
        if (emptyEl) emptyEl.classList.add('hidden');
        if (paginationEl) paginationEl.classList.remove('hidden');
    }

    // Reinitialize Lucide icons
    if (window.lucide) {
        lucide.createIcons();
    }
}

/**
 * Render catalogue cards
 */
function renderCatalogueCards() {
    const gridEl = document.getElementById('catalogue-grid');
    if (!gridEl) return;

    if (catalogueState.type === 'programmes') {
        gridEl.innerHTML = catalogueState.displayData.map(prog => renderProgrammeCard(prog)).join('');
    } else {
        gridEl.innerHTML = catalogueState.displayData.map(mod => renderModuleCard(mod)).join('');
    }
}

/**
 * Abbreviate college names for pills
 * @param {string} collegeName - Full college name
 * @returns {string} - Abbreviated college name
 */
function abbreviateCollege(collegeName) {
    if (!collegeName) return '';

    const name = collegeName.toLowerCase();

    // Map college names to abbreviations
    if (name.includes('arts') || name.includes('law') || name.includes('humanities')) return 'CAL';
    if (name.includes('social')) return 'CoSS';
    if (name.includes('life') || name.includes('env')) return 'LES';
    if (name.includes('eng') || name.includes('physical')) return 'EPS';
    if (name.includes('medicine') || name.includes('health')) return 'CMH';
    if (name.includes('corporate')) return 'Corp Serv';

    // Default: return first 3-4 chars if no match
    return collegeName.substring(0, 4).toUpperCase();
}

/**
 * Generate inner content for a programme card (collapsed or expanded state)
 * @param {object} prog - Programme data
 * @param {boolean} isExpanded - Whether the card should show expanded content
 * @returns {string} - HTML for card content
 */
function getProgrammeCardContent(prog, isExpanded) {
    const colors = getCollegeColor(prog.college);

    // Extract degree type from title
    let degreeType = '';
    if (prog.title.includes('BSc') || prog.title.includes('Bachelor of Science')) degreeType = 'BSc';
    else if (prog.title.includes('BA') || prog.title.includes('Bachelor of Arts')) degreeType = 'BA';
    else if (prog.title.includes('MSc') || prog.title.includes('Master of Science')) degreeType = 'MSc';
    else if (prog.title.includes('MA') || prog.title.includes('Master of Arts')) degreeType = 'MA';
    else if (prog.title.includes('PhD') || prog.title.includes('Doctor')) degreeType = 'PhD';
    else if (prog.title.includes('MRes')) degreeType = 'MRes';

    if (!isExpanded) {
        // Collapsed content
        return `
            <!-- Header with code badge -->
            <div class="flex items-start justify-between mb-3">
                <span class="px-3 py-1 ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText} rounded-lg text-sm font-semibold">
                    ${prog.code}
                </span>
                <div class="flex gap-1">
                    ${degreeType ? `<span class="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded" title="Degree Type">${degreeType}</span>` : ''}
                    ${prog.mode ? `<span class="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded" title="Study Mode">${prog.mode}</span>` : ''}
                </div>
            </div>

            <!-- Title -->
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 pb-3 border-b border-gray-100 dark:border-gray-700 line-clamp-2" title="${prog.title}">
                ${prog.title}
            </h3>

            <!-- College pill -->
            ${prog.college ? `
            <div class="mb-3">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText}" title="${prog.college}">
                    ${abbreviateCollege(prog.college)}
                </span>
            </div>
            ` : ''}

            <!-- Metadata -->
            <div class="space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
                ${prog.school ? `
                <div class="flex items-center">
                    <i data-lucide="school" class="w-5 h-5 mr-2 flex-shrink-0" aria-label="School"></i>
                    <span class="line-clamp-1">${prog.school}</span>
                </div>
                ` : ''}
                ${prog.campus ? `
                <div class="flex items-center">
                    <i data-lucide="map-pin" class="w-5 h-5 mr-2 flex-shrink-0" aria-label="Campus"></i>
                    <span>${prog.campus}</span>
                </div>
                ` : ''}
            </div>
        `;
    } else {
        // Expanded content with full spec - use the same preview generation as modal
        const fullSpec = prog.fullSpec;

        if (!fullSpec) {
            // Show error state if data couldn't be fetched
            return `
                <!-- Header with close button -->
                <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center gap-2">
                        <span class="px-3 py-1 ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText} rounded-lg text-sm font-semibold">
                            ${prog.code}
                        </span>
                    </div>
                    <button onclick="window.toggleCardExpansion('prog-card-${prog.code.replace(/[^a-zA-Z0-9]/g, '-')}');"
                            class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            aria-label="Close expanded view">
                        <i data-lucide="x" class="w-5 h-5 text-gray-500"></i>
                    </button>
                </div>
                <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p class="text-sm text-red-800 dark:text-red-300">
                        <i data-lucide="alert-circle" class="w-4 h-4 inline mr-1"></i>
                        Unable to load full specification data. Please try again or use the Generate button.
                    </p>
                </div>
            `;
        }

        // Generate full preview content using the same function as the modal
        const previewContent = window.generateProgrammePreview(fullSpec, catalogueState.selectedCohortType, catalogueState.selectedProgrammeYear);

        // Wrap preview content in a card container with close button
        return `
            <!-- Header with close button -->
            <div class="flex items-start justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div class="flex items-center gap-2">
                    <span class="px-3 py-1 ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText} rounded-lg text-sm font-semibold">
                        ${prog.code}
                    </span>
                </div>
                <button onclick="window.toggleCardExpansion('prog-card-${prog.code.replace(/[^a-zA-Z0-9]/g, '-')}');"
                        class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
                        aria-label="Close expanded view">
                    <i data-lucide="x" class="w-5 h-5 text-gray-500"></i>
                </button>
            </div>

            <!-- Full Specification Content -->
            <div class="catalogue-card-expanded-content max-h-[70vh] overflow-y-auto pr-2">
                ${previewContent}

                <!-- Actions at bottom -->
                <div class="flex space-x-2 pt-4 mt-6 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
                    <button onclick="event.stopPropagation(); window.selectProgrammeFromCatalogue('${prog.code.replace(/'/g, "\\'")}');"
                            class="flex-1 px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2">
                        <i data-lucide="file-down" class="w-4 h-4"></i>
                        Generate Document
                    </button>
                    <button onclick="event.stopPropagation(); navigator.clipboard.writeText('${prog.code}'); window.showNotification?.('Code copied!', 'success');"
                            class="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            title="Copy code">
                        <i data-lucide="copy" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        `;
    }
}

/**
 * Generate inner content for a module card (collapsed or expanded state)
 * @param {object} mod - Module data
 * @param {boolean} isExpanded - Whether the card should show expanded content
 * @returns {string} - HTML for card content
 */
function getModuleCardContent(mod, isExpanded) {
    const levelMatch = mod.code.match(/^L([CIHDM])/);
    const level = levelMatch ? levelMatch[1] : '';
    const colors = getCollegeColor(mod.college);
    // Make credits dynamic - use actual module data or default to 20
    const credits = mod.credits || '20';

    if (!isExpanded) {
        // Collapsed content
        return `
            <!-- Header with code and level badges -->
            <div class="flex items-start justify-between mb-3">
                <span class="px-3 py-1 ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText} rounded-lg text-sm font-semibold">
                    ${mod.code}
                </span>
                <div class="flex gap-1">
                    ${level ? `<span class="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded" title="Module Level">${level}</span>` : ''}
                    <span class="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded" title="Credit Value">${credits} credits</span>
                </div>
            </div>

            <!-- Title -->
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 pb-3 border-b border-gray-100 dark:border-gray-700 line-clamp-2" title="${mod.title}">
                ${mod.title}
            </h3>

            <!-- College pill -->
            ${mod.college ? `
            <div class="mb-3">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText}" title="${mod.college}">
                    ${abbreviateCollege(mod.college)}
                </span>
            </div>
            ` : ''}

            <!-- Metadata -->
            <div class="space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
                ${mod.school ? `
                <div class="flex items-center">
                    <i data-lucide="school" class="w-5 h-5 mr-2 flex-shrink-0" aria-label="School"></i>
                    <span class="line-clamp-1">${mod.school}</span>
                </div>
                ` : ''}
                ${mod.semester ? `
                <div class="flex items-center">
                    <i data-lucide="calendar" class="w-5 h-5 mr-2 flex-shrink-0" aria-label="Semester"></i>
                    <span>${mod.semester}</span>
                </div>
                ` : ''}
                ${mod.campus && mod.campus !== 'Not specified' ? `
                <div class="flex items-center">
                    <i data-lucide="map-pin" class="w-5 h-5 mr-2 flex-shrink-0" aria-label="Campus"></i>
                    <span>${mod.campus}</span>
                </div>
                ` : ''}
            </div>
        `;
    } else {
        // Expanded content with full spec - use the same preview generation as modal
        const fullSpec = mod.fullSpec;

        if (!fullSpec) {
            // Show error state if data couldn't be fetched
            return `
                <!-- Header with close button -->
                <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center gap-2">
                        <span class="px-3 py-1 ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText} rounded-lg text-sm font-semibold">
                            ${mod.code}
                        </span>
                    </div>
                    <button onclick="window.toggleCardExpansion('mod-card-${mod.code.replace(/[^a-zA-Z0-9]/g, '-')}');"
                            class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            aria-label="Close expanded view">
                        <i data-lucide="x" class="w-5 h-5 text-gray-500"></i>
                    </button>
                </div>
                <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p class="text-sm text-red-800 dark:text-red-300">
                        <i data-lucide="alert-circle" class="w-4 h-4 inline mr-1"></i>
                        Unable to load full specification data. Please try again or use the Generate button.
                    </p>
                </div>
            `;
        }

        // Generate full preview content using the same function as the modal
        const previewContent = window.generateModulePreview(fullSpec, catalogueState.selectedModuleYear);

        // Wrap preview content in a card container with close button
        return `
            <!-- Header with close button -->
            <div class="flex items-start justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div class="flex items-center gap-2">
                    <span class="px-3 py-1 ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText} rounded-lg text-sm font-semibold">
                        ${mod.code}
                    </span>
                </div>
                <button onclick="window.toggleCardExpansion('mod-card-${mod.code.replace(/[^a-zA-Z0-9]/g, '-')}');"
                        class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
                        aria-label="Close expanded view">
                    <i data-lucide="x" class="w-5 h-5 text-gray-500"></i>
                </button>
            </div>

            <!-- Full Specification Content -->
            <div class="catalogue-card-expanded-content max-h-[70vh] overflow-y-auto pr-2">
                ${previewContent}

                <!-- Actions at bottom -->
                <div class="flex space-x-2 pt-4 mt-6 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
                    <button onclick="event.stopPropagation(); window.selectModuleFromCatalogue('${mod.code.replace(/'/g, "\\'").trim()}');"
                            class="flex-1 px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2">
                        <i data-lucide="file-down" class="w-4 h-4"></i>
                        Generate Document
                    </button>
                    <button onclick="event.stopPropagation(); navigator.clipboard.writeText('${mod.code}'); window.showNotification?.('Code copied!', 'success');"
                            class="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            title="Copy code">
                        <i data-lucide="copy" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        `;
    }
}

/**
 * Render a programme card (wrapper only, content managed separately for animation)
 */
function renderProgrammeCard(prog) {
    const cardId = `prog-card-${prog.code.replace(/[^a-zA-Z0-9]/g, '-')}`;
    const transitionName = `card-${prog.code.replace(/[^a-zA-Z0-9]/g, '-')}`;
    const isSelected = catalogueState.selectedItems.has(prog.code);

    // Selection checkbox (only visible in selection mode)
    const checkbox = catalogueState.selectionMode ? `
        <div class="absolute bottom-3 right-3 z-10 bg-white dark:bg-gray-800 rounded-md p-1.5 shadow-md border border-gray-200 dark:border-gray-600"
             onclick="event.stopPropagation();">
            <input type="checkbox"
                   id="select-${prog.code.replace(/[^a-zA-Z0-9]/g, '_')}"
                   class="w-5 h-5 text-primary-600 rounded focus:ring-2 focus:ring-primary-500 cursor-pointer"
                   ${isSelected ? 'checked' : ''}
                   onchange="window.toggleItemSelection('${prog.code.replace(/'/g, "\\'")}', this.checked)"
                   aria-label="Select ${prog.code}">
        </div>
    ` : '';

    // Modified classes for selection state
    const selectionClasses = isSelected
        ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20'
        : '';

    const cursorClass = catalogueState.selectionMode ? 'cursor-default' : 'cursor-pointer';

    const clickHandler = catalogueState.selectionMode
        ? ''
        : `window.toggleCardExpansion('${cardId}')`;

    // Always render in collapsed state initially
    return `
        <div id="${cardId}"
             class="catalogue-card bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg card-lift ${cursorClass} ${selectionClasses} relative"
             style="view-transition-name: ${transitionName};"
             data-card-id="${cardId}"
             data-item='${JSON.stringify(prog).replace(/'/g, "&#39;")}'
             data-type="programme"
             onclick="${clickHandler}">
            ${checkbox}
            ${getProgrammeCardContent(prog, false)}
        </div>
    `;
}

/**
 * Render a module card
 */
function renderModuleCard(mod) {
    const cardId = `mod-card-${mod.code.replace(/[^a-zA-Z0-9]/g, '-')}`;
    const transitionName = `card-${mod.code.replace(/[^a-zA-Z0-9]/g, '-')}`;
    const isSelected = catalogueState.selectedItems.has(mod.code);

    // Selection checkbox (only visible in selection mode)
    const checkbox = catalogueState.selectionMode ? `
        <div class="absolute bottom-3 right-3 z-10 bg-white dark:bg-gray-800 rounded-md p-1.5 shadow-md border border-gray-200 dark:border-gray-600"
             onclick="event.stopPropagation();">
            <input type="checkbox"
                   id="select-${mod.code.replace(/[^a-zA-Z0-9]/g, '_')}"
                   class="w-5 h-5 text-primary-600 rounded focus:ring-2 focus:ring-primary-500 cursor-pointer"
                   ${isSelected ? 'checked' : ''}
                   onchange="window.toggleItemSelection('${mod.code.replace(/'/g, "\\'")}', this.checked)"
                   aria-label="Select ${mod.code}">
        </div>
    ` : '';

    // Modified classes for selection state
    const selectionClasses = isSelected
        ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20'
        : '';

    const cursorClass = catalogueState.selectionMode ? 'cursor-default' : 'cursor-pointer';

    const clickHandler = catalogueState.selectionMode
        ? ''
        : `window.toggleCardExpansion('${cardId}')`;

    // Always render in collapsed state initially
    return `
        <div id="${cardId}"
             class="catalogue-card bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg card-lift ${cursorClass} ${selectionClasses} relative"
             style="view-transition-name: ${transitionName};"
             data-card-id="${cardId}"
             data-item='${JSON.stringify(mod).replace(/'/g, "&#39;")}'
             data-type="module"
             onclick="${clickHandler}">
            ${checkbox}
            ${getModuleCardContent(mod, false)}
        </div>
    `;
}

/**
 * Update result count display
 */
function updateCatalogueResultCount() {
    const countEl = document.getElementById('catalogue-result-count');
    if (!countEl) return;

    const startIndex = (catalogueState.currentPage - 1) * catalogueState.itemsPerPage + 1;
    const endIndex = Math.min(catalogueState.currentPage * catalogueState.itemsPerPage, catalogueState.totalItems);

    if (catalogueState.totalItems === 0) {
        countEl.textContent = 'No items found';
    } else {
        countEl.textContent = `Showing ${startIndex}-${endIndex} of ${catalogueState.totalItems.toLocaleString()} ${catalogueState.type}`;
    }
}

/**
 * Update pagination controls
 */
function updateCataloguePagination() {
    const totalPages = Math.ceil(catalogueState.totalItems / catalogueState.itemsPerPage);
    const currentPage = catalogueState.currentPage;

    // Update info text
    const infoEl = document.getElementById('pagination-info');
    if (infoEl) {
        const startIndex = (currentPage - 1) * catalogueState.itemsPerPage + 1;
        const endIndex = Math.min(currentPage * catalogueState.itemsPerPage, catalogueState.totalItems);
        infoEl.textContent = `Showing ${startIndex}-${endIndex} of ${catalogueState.totalItems.toLocaleString()}`;
    }

    // Update prev/next buttons
    const prevBtn = document.getElementById('pagination-prev');
    const nextBtn = document.getElementById('pagination-next');

    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
        if (currentPage === 1) {
            prevBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            prevBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }

    if (nextBtn) {
        nextBtn.disabled = currentPage === totalPages;
        if (currentPage === totalPages) {
            nextBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            nextBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }

    // Render page numbers
    renderPageNumbers(currentPage, totalPages);
}

/**
 * Render page number buttons
 */
function renderPageNumbers(currentPage, totalPages) {
    const numbersEl = document.getElementById('pagination-numbers');
    if (!numbersEl) return;

    let pages = [];

    if (totalPages <= 7) {
        // Show all pages
        for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
        }
    } else {
        // Show first, last, current, and nearby pages
        pages.push(1);

        if (currentPage > 3) {
            pages.push('...');
        }

        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
            pages.push(i);
        }

        if (currentPage < totalPages - 2) {
            pages.push('...');
        }

        pages.push(totalPages);
    }

    numbersEl.innerHTML = pages.map(page => {
        if (page === '...') {
            return `<span class="px-3 py-2 text-gray-500 dark:text-gray-400">...</span>`;
        }

        const isActive = page === currentPage;
        return `
            <button onclick="window.goToCataloguePage(${page})"
                    class="px-3 py-2 rounded-lg transition-colors ${
                        isActive
                            ? 'bg-primary-600 text-white'
                            : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }">
                ${page}
            </button>
        `;
    }).join('');
}

/**
 * Navigate to a specific page
 */
window.goToCataloguePage = function(page) {
    if (page === 'prev') {
        catalogueState.currentPage = Math.max(1, catalogueState.currentPage - 1);
    } else if (page === 'next') {
        const totalPages = Math.ceil(catalogueState.totalItems / catalogueState.itemsPerPage);
        catalogueState.currentPage = Math.min(totalPages, catalogueState.currentPage + 1);
    } else {
        catalogueState.currentPage = page;
    }

    renderCatalogue();

    // Scroll to top of catalogue
    document.getElementById('catalogue-grid-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/**
 * Handle search input
 */
window.searchCatalogue = function() {
    const searchInput = document.getElementById('catalogue-search');
    if (!searchInput) return;

    catalogueState.searchQuery = searchInput.value;
    applyCatalogueFiltersAndSort();
    renderCatalogue();
};

/**
 * Handle sort change
 */
window.sortCatalogue = function() {
    const sortSelect = document.getElementById('catalogue-sort');
    if (!sortSelect) return;

    const value = sortSelect.value;
    const [sortBy, sortOrder] = value.split('-');

    catalogueState.sortBy = sortBy;
    catalogueState.sortOrder = sortOrder;

    applyCatalogueFiltersAndSort();
    renderCatalogue();
};

/**
 * Handle items per page change
 */
window.changeItemsPerPage = function() {
    const perPageSelect = document.getElementById('catalogue-per-page');
    if (!perPageSelect) return;

    catalogueState.itemsPerPage = parseInt(perPageSelect.value);
    catalogueState.currentPage = 1; // Reset to first page

    renderCatalogue();
};

/**
 * Update catalogue spec type (cohort or term)
 */
window.updateCatalogueSpecType = function() {
    const cohortSelect = document.getElementById('catalogue-cohort-select');
    if (!cohortSelect) return;

    catalogueState.selectedCohortType = cohortSelect.value;
    console.log(`Catalogue spec type updated to: ${catalogueState.selectedCohortType}`);
};

/**
 * Update catalogue year selection
 */
window.updateCatalogueYear = function() {
    const yearSelect = document.getElementById('catalogue-year-select');
    if (!yearSelect) return;

    catalogueState.selectedProgrammeYear = yearSelect.value;
    console.log(`Programme catalogue year updated to: ${catalogueState.selectedProgrammeYear}`);
};

/**
 * Update module catalogue year selection
 */
window.updateModuleCatalogueYear = function() {
    const yearSelect = document.getElementById('catalogue-module-year-select');
    if (!yearSelect) return;

    catalogueState.selectedModuleYear = yearSelect.value;
    console.log(`Module catalogue year updated to: ${catalogueState.selectedModuleYear}`);
};

/**
 * Toggle selection mode on/off
 */
window.toggleSelectionMode = function() {
    catalogueState.selectionMode = !catalogueState.selectionMode;

    // Update button text
    const btn = document.getElementById('selection-mode-text');
    if (btn) {
        btn.textContent = catalogueState.selectionMode ? 'Exit Selection Mode' : 'Select Multiple';
    }

    // Update button icon
    const icon = document.querySelector('#toggle-selection-mode i');
    if (icon) {
        icon.setAttribute('data-lucide', catalogueState.selectionMode ? 'x' : 'check-square');
        lucide.createIcons();
    }

    // Show/hide bulk actions
    updateBulkActionsVisibility();

    // Re-render catalogue with/without checkboxes
    renderCatalogue();

    console.log(`Selection mode: ${catalogueState.selectionMode ? 'ON' : 'OFF'}`);
};

/**
 * Toggle individual item selection
 */
window.toggleItemSelection = function(code, checked) {
    if (checked) {
        // Check if at limit
        if (catalogueState.selectedItems.size >= catalogueState.maxSelection) {
            window.showNotification?.(
                `Maximum ${catalogueState.maxSelection} items can be selected at once`,
                'warning'
            );
            // Uncheck the checkbox
            const checkbox = document.getElementById(`select-${code.replace(/[^a-zA-Z0-9]/g, '_')}`);
            if (checkbox) checkbox.checked = false;
            return;
        }
        catalogueState.selectedItems.add(code);
        console.log(`Selected: ${code}`);
    } else {
        catalogueState.selectedItems.delete(code);
        console.log(`Deselected: ${code}`);
    }

    updateSelectionCount();
    updateBulkActionsVisibility();

    // Update card styling
    renderCatalogue();
};

/**
 * Select all filtered items (up to max limit)
 */
window.selectAllFiltered = function() {
    const filteredData = catalogueState.filteredData || [];
    const limit = catalogueState.maxSelection;

    if (filteredData.length === 0) {
        window.showNotification?.('No items to select', 'warning');
        return;
    }

    // Take first N items from filtered data
    const itemsToSelect = filteredData.slice(0, limit);

    itemsToSelect.forEach(item => {
        catalogueState.selectedItems.add(item.code);
    });

    if (filteredData.length > limit) {
        window.showNotification?.(
            `Selected first ${limit} of ${filteredData.length} filtered items`,
            'info'
        );
    } else {
        window.showNotification?.(
            `Selected all ${itemsToSelect.length} filtered items`,
            'success'
        );
    }

    updateSelectionCount();
    updateBulkActionsVisibility();
    renderCatalogue();
};

/**
 * Clear all selections
 */
window.clearSelection = function() {
    const count = catalogueState.selectedItems.size;
    catalogueState.selectedItems.clear();

    if (count > 0) {
        window.showNotification?.(`Cleared ${count} selection${count !== 1 ? 's' : ''}`, 'info');
    }

    updateSelectionCount();
    updateBulkActionsVisibility();
    renderCatalogue();
};

/**
 * Show or hide the floating selection bar
 */
function showFloatingSelectionBar(show, progCode = null) {
    const existingBar = document.getElementById('floating-selection-bar');

    if (!show) {
        // Hide and remove the bar
        if (existingBar) {
            existingBar.style.opacity = '0';
            existingBar.style.transform = 'translate(-50%, 20px)';
            setTimeout(() => existingBar.remove(), 200);
        }
        return;
    }

    // Create the bar if it doesn't exist
    if (!existingBar) {
        const bar = document.createElement('div');
        bar.id = 'floating-selection-bar';
        bar.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 transition-all duration-200';
        bar.style.opacity = '0';
        bar.style.transform = 'translate(-50%, 20px)';

        bar.innerHTML = `
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" id="floating-selection-counter">
                <i data-lucide="check-square" class="w-3 h-3 mr-1"></i>
                ${catalogueState.selectedModulesFromProgramme.size}/25 selected
            </span>
            <button
                onclick="window.generateBulkModulesFromProgramme()"
                class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                id="floating-download-btn"
                ${catalogueState.selectedModulesFromProgramme.size === 0 ? 'disabled' : ''}
            >
                <i data-lucide="download" class="w-3.5 h-3.5 mr-1.5"></i>
                Download ZIP
            </button>
            <button
                onclick="window.clearModuleSelection()"
                class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
                <i data-lucide="x" class="w-3.5 h-3.5 mr-1.5"></i>
                Clear
            </button>
            <button
                onclick="window.toggleModuleSelectionMode('${progCode}')"
                class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 bg-white dark:bg-gray-800 rounded-lg border border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
            >
                <i data-lucide="x-circle" class="w-3.5 h-3.5 mr-1.5"></i>
                Exit
            </button>
        `;

        document.body.appendChild(bar);

        // Initialize icons
        if (window.lucide) lucide.createIcons();

        // Animate in
        requestAnimationFrame(() => {
            bar.style.opacity = '1';
            bar.style.transform = 'translate(-50%, 0)';
        });
    }
}

/**
 * Update the floating selection bar counter
 */
function updateFloatingSelectionBar() {
    const counter = document.getElementById('floating-selection-counter');
    const downloadBtn = document.getElementById('floating-download-btn');
    const count = catalogueState.selectedModulesFromProgramme.size;

    if (counter) {
        counter.innerHTML = `
            <i data-lucide="check-square" class="w-3 h-3 mr-1"></i>
            ${count}/25 selected
        `;
        if (window.lucide) lucide.createIcons();
    }

    if (downloadBtn) {
        if (count === 0) {
            downloadBtn.setAttribute('disabled', 'true');
        } else {
            downloadBtn.removeAttribute('disabled');
        }
    }
}

/**
 * Toggle module selection mode for a specific programme
 */
window.toggleModuleSelectionMode = function(progCode) {
    if (catalogueState.moduleSelectionMode && catalogueState.moduleSelectionProgrammeCode === progCode) {
        // Exit selection mode
        catalogueState.moduleSelectionMode = false;
        catalogueState.moduleSelectionProgrammeCode = null;
        catalogueState.selectedModulesFromProgramme.clear();
        showFloatingSelectionBar(false);
        window.showNotification?.('Module selection mode disabled', 'info');
    } else {
        // Enter selection mode
        catalogueState.moduleSelectionMode = true;
        catalogueState.moduleSelectionProgrammeCode = progCode;
        catalogueState.selectedModulesFromProgramme.clear();
        showFloatingSelectionBar(true, progCode);
        window.showNotification?.('Click checkboxes to select modules to download (max 25)', 'success');
    }

    // Re-render the expanded card content in-place to show/hide checkboxes
    const cardId = `prog-card-${progCode}`;
    const card = document.getElementById(cardId);
    if (card && catalogueState.expandedCardId === cardId) {
        // Get item data from the card's data attribute
        const itemDataJson = card.getAttribute('data-item');
        if (itemDataJson) {
            try {
                const itemData = JSON.parse(itemDataJson);
                // Re-render the content without collapsing/expanding
                replaceSkeletonWithContent(card, itemData, 'programme');
            } catch (e) {
                console.error('Failed to refresh card content:', e);
            }
        }
    }
};

/**
 * Toggle selection of a specific module
 */
window.toggleModuleSelection = function(moduleCode, year, progCode, moduleTitle, moduleCredits, moduleLevel, moduleSemester, programmeYear, checked) {
    const moduleKey = `${moduleCode}_${year}`;

    if (checked) {
        // Check if we've hit the limit
        if (catalogueState.selectedModulesFromProgramme.size >= catalogueState.maxSelection) {
            window.showNotification?.(`Maximum ${catalogueState.maxSelection} modules can be selected`, 'error');
            // Uncheck the checkbox
            event.target.checked = false;
            return;
        }

        // Add module to selection
        catalogueState.selectedModulesFromProgramme.set(moduleKey, {
            moduleCode,
            year,
            progCode,
            moduleTitle,
            moduleCredits,
            moduleLevel,
            moduleSemester,
            programmeYear
        });
    } else {
        // Remove module from selection
        catalogueState.selectedModulesFromProgramme.delete(moduleKey);
    }

    // Update counter in the UI
    const counter = document.getElementById('module-selection-counter');
    if (counter) {
        counter.innerHTML = `
            <i data-lucide="check-square" class="w-3 h-3 mr-1"></i>
            ${catalogueState.selectedModulesFromProgramme.size}/25 modules selected
        `;
        // Reinitialize icons
        if (window.lucide) lucide.createIcons();
    }

    // Update download button state
    const downloadBtn = document.querySelector('button[onclick="window.generateBulkModulesFromProgramme()"]');
    if (downloadBtn) {
        if (catalogueState.selectedModulesFromProgramme.size === 0) {
            downloadBtn.setAttribute('disabled', 'true');
            downloadBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            downloadBtn.removeAttribute('disabled');
            downloadBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }

    // Update floating selection bar counter
    updateFloatingSelectionBar();
};

/**
 * Clear all selected modules
 */
window.clearModuleSelection = function() {
    const count = catalogueState.selectedModulesFromProgramme.size;
    catalogueState.selectedModulesFromProgramme.clear();

    if (count > 0) {
        window.showNotification?.(`Cleared ${count} module selection${count !== 1 ? 's' : ''}`, 'info');
    }

    // Update floating selection bar counter
    updateFloatingSelectionBar();

    // Re-render the expanded card
    const progCode = catalogueState.moduleSelectionProgrammeCode;
    if (progCode) {
        const cardId = `prog-card-${progCode}`;
        if (catalogueState.expandedCardId === cardId) {
            window.toggleCardExpansion(cardId);
            setTimeout(() => window.toggleCardExpansion(cardId), 100);
        }
    }
};

/**
 * Generate bulk module documents from selected modules in a programme
 */
window.generateBulkModulesFromProgramme = async function() {
    const selectedModules = Array.from(catalogueState.selectedModulesFromProgramme.values());
    const progCode = catalogueState.moduleSelectionProgrammeCode;

    // Validation
    if (selectedModules.length === 0) {
        window.showNotification?.('No modules selected', 'error');
        return;
    }

    if (!catalogueState.selectedModuleYear) {
        window.showNotification?.('Please select a module year', 'error');
        return;
    }

    // Confirmation
    const confirmMsg = `Generate ${selectedModules.length} module specification${selectedModules.length !== 1 ? 's' : ''}?\n\nThey will be downloaded as a ZIP file organized by year.`;
    const confirmed = await showConfirmation('Bulk Module Generation', confirmMsg);
    if (!confirmed) return;

    const zip = new JSZip();
    const year = catalogueState.selectedModuleYear;
    let successCount = 0;
    const failedItems = [];

    // Set bulk generation flag
    catalogueState.bulkGenerationInProgress = true;

    // Add beforeunload warning
    const beforeUnloadHandler = (e) => {
        e.preventDefault();
        return e.returnValue = 'Bulk module generation in progress. Leaving this page will cancel the operation.';
    };
    window.addEventListener('beforeunload', beforeUnloadHandler);

    // Show progress modal
    showBulkProgressModal();

    try {
        // Organize modules by programme year for folder structure
        const modulesByYear = {};
        selectedModules.forEach(mod => {
            const yearLabel = getYearFolderLabel(mod.programmeYear);
            if (!modulesByYear[yearLabel]) {
                modulesByYear[yearLabel] = [];
            }
            modulesByYear[yearLabel].push(mod);
        });

        // Process modules sequentially
        for (let i = 0; i < selectedModules.length; i++) {
            if (window.bulkGenerationCancelled) {
                window.showNotification?.('Bulk generation cancelled', 'info');
                break;
            }

            const module = selectedModules[i];
            const moduleCode = module.moduleCode;
            const moduleYear = module.year;

            // Update progress
            updateBulkProgress(i + 1, selectedModules.length, `${moduleCode} - ${module.moduleTitle}`);

            try {
                // Fetch module spec data
                const data = await fetchModuleSpecData(moduleCode, moduleYear);

                if (!data || !data.code) {
                    throw new Error(`No data found for module ${moduleCode}`);
                }

                // Generate document blob using default type '+' (module spec+)
                const blob = await window.generateModuleDocBlob(data, moduleYear, '+');

                // Add to ZIP in programme year folder
                const yearLabel = getYearFolderLabel(module.programmeYear);
                const filename = `${moduleCode}_${moduleYear}.docx`;
                zip.file(`${yearLabel}/${filename}`, blob);

                successCount++;
            } catch (error) {
                console.error(`Error generating module ${moduleCode}:`, error);
                failedItems.push({
                    code: moduleCode,
                    title: module.moduleTitle,
                    error: error.message
                });
            }

            // Small delay to prevent overwhelming the browser
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Generate and download ZIP if we have any successful documents
        if (successCount > 0) {
            updateBulkProgressText('Creating ZIP file...');

            const zipBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            });

            // Create filename with programme code and timestamp
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `${progCode}_modules_${year}_${timestamp}.zip`;

            // Download ZIP file
            saveAs(zipBlob, filename);

            // Show summary
            showBulkGenerationSummary(successCount, failedItems);
        } else {
            window.showNotification?.('No documents were generated successfully', 'error');
        }

    } catch (error) {
        console.error('Bulk generation error:', error);
        window.showNotification?.(`Bulk generation failed: ${error.message}`, 'error');
    } finally {
        // Cleanup
        catalogueState.bulkGenerationInProgress = false;
        window.bulkGenerationCancelled = false;
        window.removeEventListener('beforeunload', beforeUnloadHandler);
        hideBulkProgressModal();
    }
};

/**
 * Helper function to extract year number from module code
 * Module codes typically start with a level indicator: C=0, I=0, H=1-3, M=4, D=5
 */
function getYearFromModuleCode(moduleCode) {
    if (!moduleCode || moduleCode.length === 0) return '0';

    const firstChar = moduleCode.charAt(0).toUpperCase();

    // Map based on common module code patterns at UK universities
    const yearMap = {
        'C': '0',  // Certificate
        'I': '0',  // Introductory
        'H': '1',  // Higher (typically years 1-3)
        'M': '4',  // Masters
        'D': '5'   // Doctoral
    };

    // If we have a mapping, use it
    if (yearMap[firstChar]) {
        return yearMap[firstChar];
    }

    // Otherwise, try to extract year from second character if it's a number
    if (moduleCode.length > 1 && !isNaN(moduleCode.charAt(1))) {
        return moduleCode.charAt(1);
    }

    // Default to year 0 (foundation/introductory)
    return '0';
};

/**
 * Helper function to get year folder label from programme year
 * @param {number|string} programmeYear - The year within the programme (0, 1, 2, etc.)
 * @returns {string} - Folder label like "Year0", "Year1", "Year2", etc.
 */
function getYearFolderLabel(programmeYear) {
    if (programmeYear === undefined || programmeYear === null || programmeYear === '') {
        return 'Other';
    }
    return `Year${programmeYear}`;
}

/**
 * Update selection count badge
 */
function updateSelectionCount() {
    const badge = document.getElementById('selection-count-badge');
    const count = catalogueState.selectedItems.size;

    if (badge) {
        badge.textContent = `${count} selected`;
        badge.classList.toggle('hidden', count === 0 || !catalogueState.selectionMode);
    }
}

/**
 * Show/hide bulk actions based on selection
 */
function updateBulkActionsVisibility() {
    const bulkActions = document.getElementById('bulk-actions');
    const hasSelection = catalogueState.selectedItems.size > 0;

    if (bulkActions) {
        bulkActions.classList.toggle('hidden', !hasSelection || !catalogueState.selectionMode);
    }
}

/**
 * Open catalogue filters panel
 */
window.openCatalogueFilters = function() {
    if (catalogueState.type === 'programmes') {
        window.openProgrammeFilters();
    } else {
        window.openModuleFilters();
    }
};

/**
 * Clear catalogue filters
 */
window.clearCatalogueFilters = function() {
    catalogueState.searchQuery = '';
    const searchInput = document.getElementById('catalogue-search');
    if (searchInput) {
        searchInput.value = '';
    }

    // Clear active filters
    if (catalogueState.type === 'programmes' && window.activeFilters?.programmes) {
        window.activeFilters.programmes = {
            colleges: [],
            campuses: [],
            modes: [],
            degreeTypes: []
        };
    } else if (catalogueState.type === 'modules' && window.activeFilters?.modules) {
        window.activeFilters.modules = {
            levels: [],
            semesters: [],
            schools: []
        };
    }

    applyCatalogueFiltersAndSort();
    renderCatalogue();
    updateCatalogueFilterBadges();
};

/**
 * Show loading state
 */
function showCatalogueLoading() {
    const loadingEl = document.getElementById('catalogue-loading');
    const gridEl = document.getElementById('catalogue-grid');
    const emptyEl = document.getElementById('catalogue-empty');
    const paginationEl = document.getElementById('catalogue-pagination');

    if (loadingEl) loadingEl.classList.remove('hidden');
    if (gridEl) gridEl.classList.add('hidden');
    if (emptyEl) emptyEl.classList.add('hidden');
    if (paginationEl) paginationEl.classList.add('hidden');

    const countEl = document.getElementById('catalogue-result-count');
    if (countEl) countEl.textContent = 'Loading...';
}

/**
 * Show error state
 */
function showCatalogueError() {
    const countEl = document.getElementById('catalogue-result-count');
    if (countEl) {
        countEl.textContent = 'Error loading data';
        countEl.classList.add('text-red-600', 'dark:text-red-400');
    }
}

/**
 * Select programme from catalogue (trigger generation flow)
 */
window.selectProgrammeFromCatalogue = async function(code) {
    console.log('Selected programme from catalogue:', code);

    // Try to find the programme in the filtered results with fullSpec data
    const prog = catalogueState.filteredData?.find(p => p.code === code);

    if (prog && prog.fullSpec) {
        // We have the full spec data, generate document directly
        console.log('Generating document from cached catalogue data...');
        try {
            await window.generateProgrammeDoc(
                prog.fullSpec,
                catalogueState.selectedCohortType,
                catalogueState.selectedProgrammeYear
            );
            window.showNotification?.('Document generated successfully!', 'success');
        } catch (error) {
            console.error('Error generating document:', error);
            window.showNotification?.('Error generating document. Please try again.', 'error');
        }
    } else {
        // No fullSpec data cached, fetch it first
        console.log('Fetching programme data for document generation...');
        window.showNotification?.('Fetching programme data...', 'info');

        try {
            const fullSpecData = await fetchProgrammeSpecData(
                code,
                catalogueState.selectedCohortType,
                catalogueState.selectedProgrammeYear
            );

            if (fullSpecData) {
                await window.generateProgrammeDoc(
                    fullSpecData,
                    catalogueState.selectedCohortType,
                    catalogueState.selectedProgrammeYear
                );
                window.showNotification?.('Document generated successfully!', 'success');
            } else {
                throw new Error('Failed to fetch programme data');
            }
        } catch (error) {
            console.error('Error generating document:', error);
            window.showNotification?.('Error generating document. Please try again.', 'error');
        }
    }
};

/**
 * Preview programme from catalogue
 */
window.previewProgrammeFromCatalogue = async function(code) {
    console.log('Preview programme from catalogue:', code);
    // This would trigger the preview modal
    // You can implement this to directly show preview if you have the logic
    showNotification('Feature coming soon: Direct preview from catalogue', 'info');
};

/**
 * Select module from catalogue (trigger generation flow)
 */
window.selectModuleFromCatalogue = async function(code) {
    console.log('Selected module from catalogue:', code);

    // Try to find the module in the filtered results with fullSpec data
    const mod = catalogueState.filteredData?.find(m => m.code === code);

    if (mod && mod.fullSpec) {
        // We have the full spec data, generate document directly
        console.log('Generating document from cached catalogue data...');
        try {
            await window.generateModuleDoc(mod.fullSpec, catalogueState.selectedModuleYear, 'spec');
            window.showNotification?.('Document generated successfully!', 'success');
        } catch (error) {
            console.error('Error generating document:', error);
            window.showNotification?.('Error generating document. Please try again.', 'error');
        }
    } else {
        // No fullSpec data cached, fetch it first
        console.log('Fetching module data for document generation...');
        window.showNotification?.('Fetching module data...', 'info');

        try {
            const fullSpecData = await fetchModuleSpecData(code, catalogueState.selectedModuleYear);

            if (fullSpecData) {
                await window.generateModuleDoc(fullSpecData, catalogueState.selectedModuleYear, 'spec');
                window.showNotification?.('Document generated successfully!', 'success');
            } else {
                throw new Error('Failed to fetch module data');
            }
        } catch (error) {
            console.error('Error generating document:', error);
            window.showNotification?.('Error generating document. Please try again.', 'error');
        }
    }
};

/**
 * Fetch full programme specification data
 * @param {string} progCode - Programme code
 * @param {string} cohort - Cohort type ('cohort' or 'year')
 * @param {string} year - Academic year
 * @returns {Promise<Object>} Full programme spec data
 */
async function fetchProgrammeSpecData(progCode, cohort, year) {
    try {
        const response = await axios.get(`/prog-data/${progCode}/${cohort}/${year}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching programme data:', error);
        return null;
    }
}

/**
 * Fetch full module specification data
 * @param {string} modCode - Module code
 * @param {string} year - Academic year
 * @returns {Promise<Object>} Full module spec data
 */
async function fetchModuleSpecData(modCode, year) {
    try {
        const response = await axios.get(`/mod-data/${modCode}/${year}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching module data:', error);
        return null;
    }
}

/**
 * Toggle card expansion (expand or collapse)
 * Uses View Transition API for smooth animations when available
 * @param {string} cardId - The ID of the card to toggle
 */
// Generate skeleton loading content for expanded cards
function getSkeletonContent() {
    return `
        <div class="catalogue-card-expanded-content p-6">
            <div class="skeleton-loading space-y-6 animate-pulse">
                <!-- Header skeleton -->
                <div class="space-y-3">
                    <div class="h-7 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>

                <!-- Info blocks skeleton -->
                <div class="grid grid-cols-2 gap-4">
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                </div>

                <!-- Content sections skeleton -->
                <div class="space-y-4 mt-6">
                    <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                    <div class="space-y-2">
                        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
                    </div>
                </div>

                <div class="space-y-4 mt-6">
                    <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                    <div class="space-y-2">
                        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Expand card immediately with skeleton content
function expandCardWithSkeleton(cardElement, cardId) {
    // Collapse any previously expanded card
    if (catalogueState.expandedCardId && catalogueState.expandedCardId !== cardId) {
        const previousCard = document.getElementById(catalogueState.expandedCardId);
        if (previousCard) {
            const prevItemDataJson = previousCard.getAttribute('data-item');
            const prevType = previousCard.getAttribute('data-type');

            if (prevItemDataJson && prevType) {
                try {
                    const prevItemData = JSON.parse(prevItemDataJson);
                    const prevCardId = previousCard.getAttribute('data-card-id');

                    previousCard.classList.remove('catalogue-card-expanded');
                    previousCard.onclick = function() { window.toggleCardExpansion(prevCardId); };
                    previousCard.style.cursor = 'pointer';

                    if (prevType === 'programme') {
                        previousCard.innerHTML = getProgrammeCardContent(prevItemData, false);
                    } else {
                        previousCard.innerHTML = getModuleCardContent(prevItemData, false);
                    }
                } catch (e) {
                    console.error('Failed to collapse previous card:', e);
                }
            }
        }
    }

    // Expand this card with skeleton
    const updateDOM = () => {
        catalogueState.expandedCardId = cardId;
        cardElement.classList.add('catalogue-card-expanded', 'catalogue-card-loading');
        cardElement.onclick = null;
        cardElement.style.cursor = 'default';

        // Add skeleton content
        const existingContent = cardElement.innerHTML;
        cardElement.innerHTML = existingContent + getSkeletonContent();
    };

    // Use View Transition API if available
    if (document.startViewTransition) {
        document.startViewTransition(updateDOM).finished.then(() => {
            // Scroll to card after expansion
            setTimeout(() => {
                cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        });
    } else {
        updateDOM();
        setTimeout(() => {
            cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 200);
    }
}

// Replace skeleton with real content
function replaceSkeletonWithContent(cardElement, itemData, type) {
    // Generate real content
    let realContent;
    if (type === 'programme') {
        realContent = getProgrammeCardContent(itemData, true);
    } else {
        realContent = getModuleCardContent(itemData, true);
    }

    // Replace card content
    cardElement.innerHTML = realContent;
    cardElement.classList.remove('catalogue-card-loading');

    // Re-initialize Lucide icons
    if (window.lucide) {
        lucide.createIcons();
    }

    // Attach module change handlers if this is a module
    if (type === 'module') {
        attachModuleChangeHandlers();
    }
}

// Collapse a card
function collapseCard(cardElement, cardId, itemData, type) {
    // Clean up module selection mode when collapsing
    if (catalogueState.moduleSelectionMode) {
        catalogueState.moduleSelectionMode = false;
        catalogueState.moduleSelectionProgrammeCode = null;
        catalogueState.selectedModulesFromProgramme.clear();
        showFloatingSelectionBar(false);
    }

    const updateDOM = () => {
        catalogueState.expandedCardId = null;
        cardElement.classList.remove('catalogue-card-expanded', 'catalogue-card-loading');
        cardElement.onclick = function() { window.toggleCardExpansion(cardId); };
        cardElement.style.cursor = 'pointer';

        // Update content to collapsed state
        if (type === 'programme') {
            cardElement.innerHTML = getProgrammeCardContent(itemData, false);
        } else {
            cardElement.innerHTML = getModuleCardContent(itemData, false);
        }
    };

    // Use View Transition API if available
    if (document.startViewTransition) {
        document.startViewTransition(updateDOM);
    } else {
        updateDOM();
    }
}

window.toggleCardExpansion = async function(cardId) {
    // Get the card element
    const cardElement = document.getElementById(cardId);
    if (!cardElement) {
        console.error('Card not found:', cardId);
        return;
    }

    // Get item data and type from data attributes
    const itemDataJson = cardElement.getAttribute('data-item');
    const type = cardElement.getAttribute('data-type');

    if (!itemDataJson || !type) {
        console.error('Card missing data attributes:', cardId);
        return;
    }

    // Parse the item data
    let itemData;
    try {
        itemData = JSON.parse(itemDataJson);
    } catch (e) {
        console.error('Failed to parse item data:', e);
        return;
    }

    // Check if this card is currently expanded
    const wasExpanded = catalogueState.expandedCardId === cardId;

    // If collapsing, just collapse and return
    if (wasExpanded) {
        collapseCard(cardElement, cardId, itemData, type);
        return;
    }

    // EXPANDING: Expand immediately with skeleton, then fetch data
    // Step 1: Expand card with skeleton content IMMEDIATELY
    expandCardWithSkeleton(cardElement, cardId);

    // Step 2: Fetch API data IN PARALLEL with expansion animation
    try {
        let fullSpecData = null;
        if (type === 'programme') {
            fullSpecData = await fetchProgrammeSpecData(
                itemData.code,
                catalogueState.selectedCohortType,
                catalogueState.selectedProgrammeYear
            );
        } else if (type === 'module') {
            fullSpecData = await fetchModuleSpecData(itemData.code, catalogueState.selectedModuleYear);
        }

        // Store full spec data in itemData
        if (fullSpecData) {
            itemData.fullSpec = fullSpecData;
            // Update the data-item attribute so it persists for re-renders
            cardElement.setAttribute('data-item', JSON.stringify(itemData));
        }

        // Step 3: Replace skeleton with real content
        replaceSkeletonWithContent(cardElement, itemData, type);

    } catch (error) {
        console.error('Error fetching spec data:', error);
        // Show error message in the card
        const errorHTML = `
            <div class="catalogue-card-expanded-content p-6">
                <div class="text-center text-red-600 dark:text-red-400">
                    <i data-lucide="alert-circle" class="w-12 h-12 mx-auto mb-3"></i>
                    <p class="font-semibold">Error Loading Data</p>
                    <p class="text-sm mt-2">Failed to fetch ${type} details. Please try again.</p>
                </div>
            </div>
        `;
        cardElement.innerHTML = cardElement.innerHTML.replace(
            /<div class="catalogue-card-expanded-content[\s\S]*?<\/div>\s*<\/div>/,
            errorHTML
        );
        if (window.lucide) {
            lucide.createIcons();
        }
    }
};

/**
 * Setup outside click and keyboard handlers for card expansion
 * Called once when catalogue is first loaded
 */
function setupCardExpansionHandlers() {
    // Remove any existing listeners first
    if (window._catalogueClickHandler) {
        document.removeEventListener('click', window._catalogueClickHandler);
    }
    if (window._catalogueKeyHandler) {
        document.removeEventListener('keydown', window._catalogueKeyHandler);
    }

    // Outside click handler - close expanded card when clicking outside
    window._catalogueClickHandler = function(event) {
        if (!catalogueState.expandedCardId) return;

        const expandedCard = document.getElementById(catalogueState.expandedCardId);
        if (!expandedCard) return;

        // Check if click is outside the expanded card
        if (!expandedCard.contains(event.target)) {
            // Collapse using toggleCardExpansion (uses DOM manipulation)
            window.toggleCardExpansion(catalogueState.expandedCardId);
        }
    };

    // Keyboard handler - close expanded card on ESC key
    window._catalogueKeyHandler = function(event) {
        if (event.key === 'Escape' && catalogueState.expandedCardId) {
            // Collapse using toggleCardExpansion (uses DOM manipulation)
            window.toggleCardExpansion(catalogueState.expandedCardId);
        }
    };

    // Add listeners
    document.addEventListener('click', window._catalogueClickHandler);
    document.addEventListener('keydown', window._catalogueKeyHandler);
}

/**
 * Preview module from catalogue
 */
window.previewModuleFromCatalogue = async function(code) {
    console.log('Preview module from catalogue:', code);
    // This would trigger the preview modal
    showNotification('Feature coming soon: Direct preview from catalogue', 'info');
};

// ============================================================================
// ONBOARDING AND WELCOME MODALS
// ============================================================================

/**
 * Show welcome modal
 */
window.showWelcomeModal = function() {
    const modal = document.getElementById('welcome-modal');
    const versionSpan = document.getElementById('welcome-version');

    if (!modal) return;

    // Set version number
    if (versionSpan && window.CONSTANTS) {
        versionSpan.textContent = window.CONSTANTS.APP_VERSION;
    }

    // Show modal
    modal.classList.remove('hidden');

    // Reinitialize icons
    if (window.lucide) {
        lucide.createIcons();
    }
};

/**
 * Hide welcome modal
 */
window.hideWelcomeModal = function() {
    const modal = document.getElementById('welcome-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

/**
 * Show What's New modal
 */
window.showWhatsNew = function() {
    const modal = document.getElementById('whats-new-modal');
    const content = document.getElementById('changelog-content');

    if (!modal || !content) return;

    // Populate changelog
    if (window.CONSTANTS && window.CONSTANTS.CHANGELOG) {
        content.innerHTML = window.CONSTANTS.CHANGELOG.map((entry, index) => {
            const isLatest = index === 0;
            return `
                <div class="border-l-4 ${isLatest ? 'border-primary-500' : 'border-gray-300 dark:border-gray-600'} pl-4">
                    <div class="flex items-start justify-between mb-2">
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                ${entry.title}
                                ${isLatest ? '<span class="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-xs rounded-full font-medium">Latest</span>' : ''}
                            </h3>
                            <p class="text-sm text-gray-600 dark:text-gray-400">
                                Version ${entry.version} • ${entry.date}
                            </p>
                        </div>
                    </div>
                    <ul class="space-y-2 mt-3">
                        ${entry.features.map(feature => `
                            <li class="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <i data-lucide="check" class="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0"></i>
                                <span>${feature}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }).join('');

        // Reinitialize icons
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    // Show modal
    modal.classList.remove('hidden');

    // Mark changelog as seen
    if (window.OnboardingManager) {
        window.OnboardingManager.markChangelogAsSeen();
    }
};

/**
 * Hide What's New modal
 */
window.hideWhatsNew = function() {
    const modal = document.getElementById('whats-new-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

/**
 * Initialize onboarding system
 */
window.initializeOnboarding = function() {
    // Setup welcome modal close button
    const welcomeCloseBtn = document.getElementById('welcome-close-btn');
    if (welcomeCloseBtn) {
        welcomeCloseBtn.addEventListener('click', () => {
            const dontShow = document.getElementById('welcome-dont-show');
            const startTour = document.getElementById('welcome-start-tour');

            // Mark as completed if "don't show" is checked
            if (dontShow && dontShow.checked && window.OnboardingManager) {
                window.OnboardingManager.completeOnboarding();
            }

            window.hideWelcomeModal();

            // Start tour if requested
            if (startTour && startTour.checked) {
                setTimeout(() => {
                    window.startFeatureTour();
                }, 500);
            }
        });
    }

    // Setup What's New modal close button
    const whatsNewCloseBtn = document.getElementById('whats-new-close-btn');
    if (whatsNewCloseBtn) {
        whatsNewCloseBtn.addEventListener('click', () => {
            window.hideWhatsNew();
        });
    }

    // Check if we should show welcome modal
    if (window.OnboardingManager) {
        if (window.OnboardingManager.isFirstVisit()) {
            // First visit - show welcome modal
            setTimeout(() => {
                window.showWelcomeModal();
            }, 1000);
        } else if (window.OnboardingManager.hasNewFeatures() && !window.OnboardingManager.hasSeenCurrentVersion()) {
            // Returning user with new features - show What's New
            setTimeout(() => {
                window.showWhatsNew();
            }, 1000);
        }
    }
};

/**
 * Helper function to switch tabs for the tour
 * Uses Alpine.js to manipulate the reactive state
 */
function switchToTabForTour(tabName) {
    // Find the main tab container with Alpine.js data
    const tabContainer = document.querySelector('[x-data*="activeTab"]');

    if (!tabContainer) {
        console.warn('Tab container not found');
        return;
    }

    // Access Alpine.js component data
    if (tabContainer._x_dataStack && tabContainer._x_dataStack[0]) {
        const alpineData = tabContainer._x_dataStack[0];

        // Only switch if not already on the target tab
        if (alpineData.activeTab !== tabName) {
            console.log(`Switching from ${alpineData.activeTab} to ${tabName}`);
            alpineData.activeTab = tabName;

            // If switching to analytics, also set the default analytics sub-tab
            if (tabName === 'analytics') {
                const analyticsContainer = document.querySelector('[x-data*="analyticsTab"]');
                if (analyticsContainer && analyticsContainer._x_dataStack && analyticsContainer._x_dataStack[0]) {
                    analyticsContainer._x_dataStack[0].analyticsTab = 'usage';
                }
            }
        }
    } else {
        console.warn('Alpine.js data not accessible on tab container');
    }
}

/**
 * Cached module data for tour demonstration
 * Real module: 00013 from 2026 data
 */
const TOUR_DEMO_MODULE = {
    code: "00013",
    title: "Clinical Oncology Dissertation",
    credits: 60,
    level: "LM",
    semester: "Full Term",
    lead: "Dr Jean Assender",
    year: "2026"
};

/**
 * Cached programme data for tour demonstration
 * Real programme: 3041 Economics BSc from 2026 term data
 */
const TOUR_DEMO_PROGRAMME = {
    progCode: "3041",
    progTitle: "BSc Economics Full-time",
    shortTitle: "BSc Economics",
    longTitle: "Economics",
    longQual: "Bachelor of Science",
    college: "College Social Sciences",
    school: "Birmingham Business School",
    mode: "Full-time",
    campus: "UoB Edgbaston Campus",
    length: "3 Year(s)",
    year0Exists: false,
    year1Exists: true,
    year2Exists: true,
    year3Exists: false,
    year4Exists: false,
    year5Exists: false,
    years: {
        year0: null,
        year1: {
            yearText: "Options are available subject to timetable constraints and must be chosen so that equal credits are taken in each semester.",
            rules: {
                compulsory: [
                    {
                        ruleText: "The following must be taken:",
                        module: [
                            { moduleCode: "31836", moduleTitle: "LC The Global Economy", moduleCredits: 20, moduleLevel: "LC", moduleSemester: "Semester 2" },
                            { moduleCode: "33951", moduleTitle: "LC Contemporary Economic Challenges A", moduleCredits: 10, moduleLevel: "LC", moduleSemester: "Semester 1" },
                            { moduleCode: "33952", moduleTitle: "LC Contemporary Economic Challenges B", moduleCredits: 10, moduleLevel: "LC", moduleSemester: "Semester 2" },
                            { moduleCode: "29165", moduleTitle: "LC Applied Economics and Statistics", moduleCredits: 20, moduleLevel: "LC", moduleSemester: "Semester 2" },
                            { moduleCode: "29194", moduleTitle: "LC Principles of Economics", moduleCredits: 20, moduleLevel: "LC", moduleSemester: "Semester 1" },
                            { moduleCode: "33969", moduleTitle: "LC Professional and Academic Skills Development for Economists A", moduleCredits: 10, moduleLevel: "LC", moduleSemester: "Semester 1" },
                            { moduleCode: "33971", moduleTitle: "LC Professional and Academic Skills Development for Economists B", moduleCredits: 10, moduleLevel: "LC", moduleSemester: "Semester 2" }
                        ]
                    }
                ],
                optional: [
                    {
                        ruleText: "Students without A-Level Mathematics or with A-Level Mathematics grade C or below or equivalent MUST choose module Introduction to Mathematics for Economics. Students with A-Level Mathematics grades A*, A and B or equivalent MUST choose module Mathematics for Economics",
                        module: [
                            { moduleCode: "31832", moduleTitle: "LC Mathematics for Economics", moduleCredits: 20, moduleLevel: "LC", moduleSemester: "Semester 1" },
                            { moduleCode: "29186", moduleTitle: "LC Introduction to Mathematics for Economics", moduleCredits: 20, moduleLevel: "LC", moduleSemester: "Semester 1" }
                        ]
                    }
                ]
            }
        },
        year2: {
            yearText: "",
            rules: {
                compulsory: [
                    {
                        ruleText: "The following must be taken:",
                        module: [
                            { moduleCode: "28536", moduleTitle: "LI Microeconomics", moduleCredits: 20, moduleLevel: "LI", moduleSemester: "Semester 1" },
                            { moduleCode: "29172", moduleTitle: "LI Econometrics", moduleCredits: 20, moduleLevel: "LI", moduleSemester: "Semester 1" },
                            { moduleCode: "29189", moduleTitle: "LI Macroeconomics", moduleCredits: 20, moduleLevel: "LI", moduleSemester: "Semester 1" }
                        ]
                    }
                ],
                optional: [
                    {
                        ruleText: "Choose 60 credits from the following modules:",
                        module: [
                            { moduleCode: "23274", moduleTitle: "LI Contemporary Issues in the UK Economy", moduleCredits: 20, moduleLevel: "LI", moduleSemester: "Semester 2" },
                            { moduleCode: "32213", moduleTitle: "LI China and the World Economy", moduleCredits: 20, moduleLevel: "LI", moduleSemester: "Semester 2" },
                            { moduleCode: "32216", moduleTitle: "LI Behavioural and Experimental Economics", moduleCredits: 20, moduleLevel: "LI", moduleSemester: "Semester 2" },
                            { moduleCode: "33188", moduleTitle: "LI Financial Markets and Institutions", moduleCredits: 20, moduleLevel: "LI", moduleSemester: "Semester 2" },
                            { moduleCode: "33189", moduleTitle: "LI Mathematical Methods for Economics", moduleCredits: 20, moduleLevel: "LI", moduleSemester: "Semester 2" },
                            { moduleCode: "33191", moduleTitle: "LI Mathematical Methods for Statistics and Econometrics", moduleCredits: 20, moduleLevel: "LI", moduleSemester: "Semester 2" },
                            { moduleCode: "41465", moduleTitle: "LI Economics with Machine Learning", moduleCredits: 20, moduleLevel: "LI", moduleSemester: "Semester 2" },
                            { moduleCode: "29168", moduleTitle: "LI Development Economics", moduleCredits: 20, moduleLevel: "LI", moduleSemester: "Semester 2" },
                            { moduleCode: "29179", moduleTitle: "LI Environmental Economics", moduleCredits: 20, moduleLevel: "LI", moduleSemester: "Semester 2" }
                        ]
                    }
                ]
            }
        },
        year3: null,
        year4: null,
        year5: null
    }
};

/**
 * Create a tour demo programme card with cached data
 * Returns the card element
 */
function createTourProgrammeCard() {
    const prog = TOUR_DEMO_PROGRAMME;
    const cardId = `prog-card-TOUR-DEMO-${prog.progCode}`;

    // Check if already exists
    let existingCard = document.getElementById(cardId);
    if (existingCard) {
        return existingCard;
    }

    // Create card HTML (simplified version)
    const cardHTML = `
        <div id="${cardId}"
             class="catalogue-card bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-shadow cursor-pointer"
             data-type="programme"
             data-item='${JSON.stringify(prog)}'>
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded text-xs font-medium">
                            ${prog.shortTitle}
                        </span>
                    </div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        ${prog.progCode} - ${prog.longTitle}
                    </h3>
                    <div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <div class="flex items-center gap-2">
                            <i data-lucide="building-2" class="w-3.5 h-3.5"></i>
                            <span>${prog.school}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <i data-lucide="clock" class="w-3.5 h-3.5"></i>
                            <span>${prog.mode} • ${prog.length}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <span class="text-xs text-primary-600 dark:text-primary-400 font-medium">
                    DEMO - For Tour Only
                </span>
            </div>
        </div>
    `;

    // Insert at beginning of catalogue grid
    const grid = document.getElementById('catalogue-grid');
    if (grid) {
        grid.insertAdjacentHTML('afterbegin', cardHTML);

        // Reinitialize lucide icons
        if (window.lucide) {
            lucide.createIcons();
        }

        return document.getElementById(cardId);
    }

    return null;
}

/**
 * Helper function to expand tour demo programme card
 * Returns the programme code for use in module selection
 */
async function expandFirstProgrammeCard() {
    // Create or get tour demo card
    const demoCard = createTourProgrammeCard();

    if (!demoCard) {
        console.warn('Could not create tour demo card');
        return null;
    }

    const cardId = demoCard.id;
    const prog = TOUR_DEMO_PROGRAMME;

    console.log('Expanding tour demo card:', cardId);

    // Manually render the expanded content using cached data
    // Using '2026' and 'term' to match the cached programme data
    const expandedHTML = window.generateProgrammePreview(prog, '2026', 'term');

    // Find or create expanded content container
    let contentDiv = demoCard.querySelector('.catalogue-card-expanded-content');
    if (!contentDiv) {
        contentDiv = document.createElement('div');
        contentDiv.className = 'catalogue-card-expanded-content max-h-[70vh] overflow-y-auto pr-2 mt-4';
        demoCard.appendChild(contentDiv);
    }

    contentDiv.innerHTML = expandedHTML;

    // Add expanded class
    demoCard.classList.add('catalogue-card-expanded');

    // Update catalogue state
    catalogueState.expandedCardId = cardId;

    // Reinitialize icons
    if (window.lucide) {
        lucide.createIcons();
    }

    // Wait for rendering
    await new Promise(resolve => setTimeout(resolve, 500));

    return prog.progCode;
}

/**
 * Helper function to enable module selection mode for tour
 */
function enableModuleSelectionForTour(progCode) {
    if (!progCode) {
        console.warn('No programme code provided for module selection');
        return;
    }

    console.log('Enabling module selection for:', progCode);

    if (window.toggleModuleSelectionMode) {
        window.toggleModuleSelectionMode(progCode);
    }
}

/**
 * Helper function to show module details for tour
 * Displays cached module data without API call
 */
function showModuleDetailsForTour() {
    const mod = TOUR_DEMO_MODULE;

    // Create simplified module details HTML
    const detailsHTML = `
        <div id="tour-module-details" class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                ${mod.code} - ${mod.title}
            </h3>
            <dl class="grid grid-cols-1 gap-4">
                <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Semester:</dt>
                    <dd class="flex items-center gap-2 mt-1">
                        <select id="edit-semester"
                                class="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                            <option value="Semester 1" ${mod.semester === 'Semester 1' ? 'selected' : ''}>Semester 1</option>
                            <option value="Semester 2" ${mod.semester === 'Semester 2' ? 'selected' : ''}>Semester 2</option>
                            <option value="Summer Period">Summer Period</option>
                            <option value="Full Term">Full Term</option>
                        </select>
                        <button id="submit-semester-change" class="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700">
                            Update
                        </button>
                    </dd>
                </div>
                <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Module Lead:</dt>
                    <dd class="flex items-center gap-2 mt-1">
                        <div class="relative w-56">
                            <textarea id="edit-module-lead"
                                      rows="1"
                                      placeholder="Enter module lead name"
                                      class="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none">${mod.lead}</textarea>
                        </div>
                        <button id="submit-lead-change" class="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700">
                            Update
                        </button>
                    </dd>
                </div>
            </dl>
            <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <span class="text-xs text-primary-600 dark:text-primary-400 font-medium">
                    DEMO - For Tour Only
                </span>
            </div>
        </div>
    `;

    // Find modules tab content and insert demo details
    const modulesContent = document.querySelector('[x-show="activeTab === \'modules\'"]');
    if (modulesContent) {
        // Insert at the top of modules content
        modulesContent.insertAdjacentHTML('afterbegin', detailsHTML);
    }

    console.log('Showing tour demo module details');
}

/**
 * Helper function to scroll to a section within expanded programme card
 */
function scrollToSectionInCard(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) {
        console.warn('Section not found:', sectionId);
        return;
    }

    // Scroll to the section
    section.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });

    console.log('Scrolled to section:', sectionId);
}

/**
 * Helper function to cleanup tour state
 */
async function cleanupTourState() {
    // Exit catalogue selection mode if active
    if (catalogueState.selectionMode) {
        window.toggleSelectionMode?.();
    }

    // Disable module selection if active
    if (catalogueState.moduleSelectionMode) {
        window.clearModuleSelection?.();
    }

    // Collapse any expanded card
    if (catalogueState.expandedCardId) {
        catalogueState.expandedCardId = null;
    }

    // Remove tour demo card
    const demoCard = document.getElementById('prog-card-TOUR-DEMO-3041');
    if (demoCard) {
        demoCard.remove();
    }

    // Remove tour demo module details
    const demoModule = document.getElementById('tour-module-details');
    if (demoModule) {
        demoModule.remove();
    }
}

/**
 * Start feature tour using Driver.js
 */
window.startFeatureTour = function() {
    // Check if Driver.js is loaded
    // The IIFE build exports under window.driver.js.driver
    let driverConstructor = null;

    if (typeof window.driver !== 'undefined') {
        if (typeof window.driver === 'function') {
            driverConstructor = window.driver;
        } else if (window.driver.js && typeof window.driver.js.driver === 'function') {
            driverConstructor = window.driver.js.driver;
        } else if (typeof window.driver.driver === 'function') {
            driverConstructor = window.driver.driver;
        }
    }

    if (!driverConstructor) {
        window.showNotification?.('Feature tour library not loaded', 'error');
        console.error('Driver.js not available. window.driver:', window.driver);
        return;
    }

    // Store programme code for module selection demo
    let tourProgrammeCode = null;

    const driverObj = driverConstructor({
        showProgress: true,
        showButtons: ['next', 'previous', 'close'],
        steps: [
            {
                popover: {
                    title: 'Welcome to the Tour! 👋',
                    description: 'Let\'s explore the key features of the Specification Generator. This tour will guide you through the main sections of the application.',
                }
            },
            {
                element: '#helpButton',
                popover: {
                    title: 'Help & What\'s New',
                    description: 'Click here anytime to see the changelog and learn about new features. You can also restart this tour from there!',
                    side: 'left',
                    align: 'start'
                }
            },
            {
                element: '#darkModeToggle',
                popover: {
                    title: 'Dark Mode',
                    description: 'Toggle between light and dark themes. Your preference is saved automatically.',
                    side: 'left',
                    align: 'start'
                }
            },
            {
                element: 'nav.flex.-mb-px > button:nth-child(1)',
                popover: {
                    title: 'Generate Programmes Tab',
                    description: 'Click this tab to search for and generate individual programme specifications.',
                    side: 'bottom',
                    align: 'start'
                }
            },
            {
                element: '#prog-search',
                popover: {
                    title: 'Programme Search',
                    description: 'Search for programmes by code or title. Start typing to see intelligent suggestions with fuzzy matching.',
                    side: 'bottom',
                    align: 'start'
                },
                onHighlightStarted: () => {
                    setTimeout(() => switchToTabForTour('programmes'), 100);
                }
            },
            {
                element: 'nav.flex.-mb-px > button:nth-child(2)',
                popover: {
                    title: 'Generate Modules Tab',
                    description: 'Click this tab to search for and generate individual module specifications.',
                    side: 'bottom',
                    align: 'start'
                }
            },
            {
                element: '#mod-search',
                popover: {
                    title: 'Module Search',
                    description: 'Search for modules by code or title. Each search is lightning-fast and remembers your recent searches.',
                    side: 'bottom',
                    align: 'start'
                },
                onHighlightStarted: () => {
                    setTimeout(() => switchToTabForTour('modules'), 100);
                }
            },
            {
                popover: {
                    title: 'Module Details Display',
                    description: 'After searching for a module, its details appear with several editable fields. Let me show you the most important ones...',
                },
                onHighlightStarted: () => {
                    setTimeout(() => {
                        switchToTabForTour('modules');
                        // Show demo module details
                        showModuleDetailsForTour();
                        // Wait a bit for DOM to update
                        setTimeout(() => {
                            // Ensure fields are visible
                            const moduleDetails = document.getElementById('tour-module-details');
                            if (moduleDetails) {
                                moduleDetails.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                        }, 300);
                    }, 100);
                }
            },
            {
                element: '#edit-semester',
                popover: {
                    title: 'Editable Semester Field 📝',
                    description: 'When generating a module specification, you can edit certain fields like the semester. This dropdown lets you override the default semester value. Submitting changes will send an email to CMT, and updates will be processed in Banner within 24 hours.',
                    side: 'right',
                    align: 'start'
                },
                onHighlightStarted: () => {
                    setTimeout(() => {
                        switchToTabForTour('modules');
                        // Ensure the element is visible by scrolling to it
                        const semesterField = document.getElementById('edit-semester');
                        if (semesterField) {
                            semesterField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }, 100);
                }
            },
            {
                element: '#edit-module-lead',
                popover: {
                    title: 'Module Lead Field',
                    description: 'You can also edit the module lead name. Simply type in this field to customize who is listed as the module lead. Submitting changes will send an email to CMT, and updates will be processed in Banner within 24 hours.',
                    side: 'right',
                    align: 'start'
                },
                onHighlightStarted: () => {
                    setTimeout(() => {
                        switchToTabForTour('modules');
                        // Ensure the element is visible
                        const leadField = document.getElementById('edit-module-lead');
                        if (leadField) {
                            leadField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }, 100);
                }
            },
            {
                element: 'nav.flex.-mb-px > button:nth-child(4)',
                popover: {
                    title: 'Programme & Module Catalogue 📚',
                    description: 'Click this tab to browse all available programmes and modules with powerful filtering options. Let\'s explore!',
                    side: 'bottom',
                    align: 'start'
                }
            },
            {
                popover: {
                    title: 'Browse & Filter Programmes',
                    description: 'You can filter programmes by academic year, school, college, and qualification type. Each programme card can be expanded to see full details.',
                },
                onHighlightStarted: () => {
                    setTimeout(() => switchToTabForTour('catalogue'), 100);
                }
            },
            {
                popover: {
                    title: 'Expanding Programme Cards',
                    description: 'Let me show you what happens when you expand a programme card. Watch as the first card expands...',
                },
                onHighlightStarted: async () => {
                    setTimeout(async () => {
                        switchToTabForTour('catalogue');
                        // Expand first programme card
                        tourProgrammeCode = await expandFirstProgrammeCard();
                    }, 100);
                }
            },
            {
                element: '#section-details',
                popover: {
                    title: 'Programme Details',
                    description: 'Inside the expanded card, you can see all programme information: title, school, type, mode, duration, campus, and college.',
                    side: 'left',
                    align: 'start'
                },
                onHighlightStarted: () => {
                    // Give card time to expand, then scroll to details
                    setTimeout(() => {
                        switchToTabForTour('catalogue');
                        scrollToSectionInCard('section-details');
                    }, 500);
                }
            },
            {
                element: '#section-structure',
                popover: {
                    title: 'Programme Structure & Years',
                    description: 'Below the details, you\'ll find the programme structure organized by year sections. Each year shows all modules including compulsory, optional, and qualifying requirements.',
                    side: 'left',
                    align: 'start'
                },
                onHighlightStarted: () => {
                    // Scroll to years section
                    setTimeout(() => {
                        scrollToSectionInCard('section-structure');
                    }, 300);
                }
            },
            {
                element: '#select-modules-btn',
                popover: {
                    title: 'Select Modules Button 🎯',
                    description: 'Click this button to enable module selection mode, which adds checkboxes next to every module in the year sections below. You can then select up to 25 modules to download at once!',
                    side: 'left',
                    align: 'start'
                },
                onHighlightStarted: () => {
                    // Scroll to the button to make it visible
                    setTimeout(() => {
                        const button = document.getElementById('select-modules-btn');
                        if (button) {
                            button.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }, 300);
                }
            },
            {
                popover: {
                    title: 'Module Selection Mode Enabled',
                    description: 'Now I\'ll enable module selection mode. Watch for the checkboxes to appear next to each module...',
                },
                onHighlightStarted: () => {
                    setTimeout(() => {
                        if (tourProgrammeCode) {
                            enableModuleSelectionForTour(tourProgrammeCode);
                        }
                    }, 100);
                }
            },
            {
                popover: {
                    title: 'Select Modules',
                    description: 'Click the checkboxes next to modules you want to download. You can select up to 25 modules from any year section in the programme.',
                },
                onHighlightStarted: () => {
                    setTimeout(() => {
                        switchToTabForTour('catalogue');
                        // Scroll to years to show checkboxes
                        scrollToSectionInCard('section-structure');

                        // Expand Year 1 section to show the modules with checkboxes
                        setTimeout(() => {
                            const year1Button = document.querySelector('button[onclick*="toggleSection(\'year1\'"]');
                            const year1Content = document.getElementById('year1-content');
                            const year1Icon = document.getElementById('year1-icon');

                            if (year1Button && year1Content && year1Content.classList.contains('hidden')) {
                                // Expand Year 1
                                year1Content.classList.remove('hidden');
                                if (year1Icon) {
                                    year1Icon.classList.add('rotate-90');
                                }
                            }
                        }, 500);
                    }, 700);
                }
            },
            {
                popover: {
                    title: 'Download Selected Modules 📦',
                    description: 'Once you\'ve selected modules, use the floating bar at the bottom of the screen to download them as a ZIP. They\'ll be organized in year folders (Year0/, Year1/, Year2/, etc.).',
                },
                onHighlightStarted: () => {
                    setTimeout(() => {
                        scrollToSectionInCard('section-details');
                    }, 100);
                }
            },
            {
                popover: {
                    title: 'Another Way to Bulk Download 🔄',
                    description: 'There\'s also a separate multi-selection feature! You can select multiple programmes OR modules directly from the catalogue grid. Let me show you...',
                },
                onHighlightStarted: () => {
                    setTimeout(async () => {
                        // Clean up module selection first
                        if (catalogueState.moduleSelectionMode) {
                            window.clearModuleSelection?.();
                        }
                        // Collapse the expanded card properly
                        if (catalogueState.expandedCardId) {
                            const cardId = catalogueState.expandedCardId;
                            const card = document.getElementById(cardId);

                            if (card) {
                                // Remove expanded class
                                card.classList.remove('catalogue-card-expanded');

                                // Remove expanded content
                                const contentDiv = card.querySelector('.catalogue-card-expanded-content');
                                if (contentDiv) {
                                    contentDiv.remove();
                                }
                            }

                            // Clear state
                            catalogueState.expandedCardId = null;
                            tourProgrammeCode = null;
                        }
                    }, 100);
                }
            },
            {
                element: '#toggle-selection-mode',
                popover: {
                    title: 'Catalogue Multi-Selection',
                    description: 'Click this "Select Multiple" button to enable multi-selection mode on the catalogue grid.',
                    side: 'bottom',
                    align: 'start'
                },
                onHighlightStarted: () => {
                    setTimeout(() => switchToTabForTour('catalogue'), 500);
                }
            },
            {
                popover: {
                    title: 'Grid Selection Mode',
                    description: 'Watch as checkboxes appear on each programme/module card in the grid. You can select up to 25 items at once!',
                },
                onHighlightStarted: () => {
                    setTimeout(() => {
                        // Enable catalogue selection mode
                        if (!catalogueState.selectionMode && window.toggleSelectionMode) {
                            window.toggleSelectionMode();
                        }
                    }, 100);
                }
            },
            {
                popover: {
                    title: 'Bulk Generate from Grid 🚀',
                    description: 'Select multiple items by clicking their checkboxes, then click "Generate Bulk Documents (ZIP)" to download them all at once. This is perfect for generating multiple programme or module specs in one go!',
                },
                onHighlightStarted: () => {
                    setTimeout(() => switchToTabForTour('catalogue'), 100);
                }
            },
            {
                element: 'nav.flex.-mb-px > button:nth-child(3)',
                popover: {
                    title: 'Usage Analytics 📊',
                    description: 'Click this tab to track your document generation activity and see usage statistics.',
                    side: 'bottom',
                    align: 'start'
                },
                onHighlightStarted: async () => {
                    // Cleanup catalogue state before moving on
                    await cleanupTourState();
                }
            },
            {
                popover: {
                    title: 'Analytics Dashboard',
                    description: 'View charts showing monthly trends, college usage, school statistics, and recent activity. Filter by year, college, or date range to analyze your usage patterns.',
                },
                onHighlightStarted: () => {
                    setTimeout(() => switchToTabForTour('analytics'), 100);
                }
            },
            {
                popover: {
                    title: 'Tour Complete! 🎉',
                    description: 'You\'re all set! Start generating specifications, explore the catalogue, or check out the analytics. Happy generating!',
                }
            }
        ],
        onDestroyed: async () => {
            // Mark tour as completed
            if (window.OnboardingManager) {
                window.OnboardingManager.completeTour('main-feature-tour');
            }

            // Cleanup tour state
            await cleanupTourState();

            // Return to programmes tab (generate tab)
            setTimeout(() => switchToTabForTour('programmes'), 300);
        }
    });

    // Hide any open modals before starting tour
    window.hideWelcomeModal?.();
    window.hideWhatsNew?.();

    // Start the tour
    driverObj.drive();
};

// ==========================================
// Deep Search Functionality
// ==========================================

(function() {
    // Deep search state
    const deepSearchState = {
        query: '',
        year: '2026',
        results: [],
        total: { programmes: 0, modules: 0, combined: 0 },
        offset: 0,
        limit: 20,
        loading: false,
        debounceTimer: null
    };

    // Initialize deep search when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        initializeDeepSearch();
    });

    function initializeDeepSearch() {
        const searchInput = document.getElementById('deep-search-input');
        const yearSelect = document.getElementById('deep-search-year');

        if (!searchInput || !yearSelect) {
            console.log('Deep search elements not found, skipping initialization');
            return;
        }

        // Search input handler with debounce
        searchInput.addEventListener('input', function(e) {
            const query = e.target.value.trim();

            // Clear previous debounce
            if (deepSearchState.debounceTimer) {
                clearTimeout(deepSearchState.debounceTimer);
            }

            // Reset state
            deepSearchState.query = query;
            deepSearchState.offset = 0;
            deepSearchState.results = [];

            // Show empty state if query too short
            if (query.length < 3) {
                showDeepSearchEmptyState();
                return;
            }

            // Debounce the search
            deepSearchState.debounceTimer = setTimeout(() => {
                performDeepSearch();
            }, 300);
        });

        // Year selector handler
        yearSelect.addEventListener('change', function(e) {
            deepSearchState.year = e.target.value;
            deepSearchState.offset = 0;
            deepSearchState.results = [];

            if (deepSearchState.query.length >= 3) {
                performDeepSearch();
            }
        });

        // Show initial empty state
        showDeepSearchEmptyState();

        console.log('Deep search initialized');
    }

    async function performDeepSearch() {
        if (deepSearchState.loading) return;

        deepSearchState.loading = true;
        showDeepSearchLoading();

        try {
            const params = new URLSearchParams({
                q: deepSearchState.query,
                year: deepSearchState.year,
                limit: deepSearchState.limit,
                offset: deepSearchState.offset
            });

            const response = await axios.get(`/search/all?${params}`);
            const data = response.data;

            if (data.success) {
                deepSearchState.total = data.total;

                if (deepSearchState.offset === 0) {
                    deepSearchState.results = data.results;
                } else {
                    deepSearchState.results = [...deepSearchState.results, ...data.results];
                }

                renderDeepSearchResults();
            } else {
                showDeepSearchError(data.error || 'Search failed');
            }
        } catch (error) {
            console.error('Deep search error:', error);
            showDeepSearchError('Failed to perform search. Please try again.');
        } finally {
            deepSearchState.loading = false;
            hideDeepSearchLoading();
        }
    }

    function renderDeepSearchResults() {
        const resultsContainer = document.getElementById('deep-search-results');
        const summaryContainer = document.getElementById('deep-search-summary');
        const countSpan = document.getElementById('deep-search-count');
        const breakdownSpan = document.getElementById('deep-search-breakdown');
        const emptyState = document.getElementById('deep-search-empty');
        const noResultsState = document.getElementById('deep-search-no-results');
        const loadMoreBtn = document.getElementById('deep-search-load-more');

        // Hide all states first
        emptyState?.classList.add('hidden');
        noResultsState?.classList.add('hidden');
        loadMoreBtn?.classList.add('hidden');

        if (deepSearchState.results.length === 0) {
            resultsContainer.innerHTML = '';
            summaryContainer?.classList.add('hidden');
            noResultsState?.classList.remove('hidden');
            return;
        }

        // Show summary
        summaryContainer?.classList.remove('hidden');
        if (countSpan) {
            countSpan.textContent = `Found ${deepSearchState.total.combined} results`;
        }
        if (breakdownSpan) {
            breakdownSpan.textContent = `${deepSearchState.total.programmes} programmes, ${deepSearchState.total.modules} modules`;
        }

        // Render results
        resultsContainer.innerHTML = deepSearchState.results.map(result => {
            if (result.type === 'programme') {
                return renderProgrammeResult(result);
            } else {
                return renderModuleResult(result);
            }
        }).join('');

        // Reinitialize Lucide icons for the new content
        if (window.lucide) {
            window.lucide.createIcons();
        }

        // Show load more button if there are more results
        if (deepSearchState.results.length < deepSearchState.total.combined) {
            loadMoreBtn?.classList.remove('hidden');
        }
    }

    function renderProgrammeResult(prog) {
        const matchesHtml = prog.matches.map(match => `
            <div class="mt-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <div class="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">
                    Match in: ${escapeHtml(match.field)}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    ${match.snippet}
                </div>
            </div>
        `).join('');

        return `
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
                <div class="flex items-start gap-4">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        <i data-lucide="graduation-cap" class="w-3 h-3 mr-1"></i>
                        Programme
                    </span>
                    <div class="flex-1 min-w-0">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                            ${escapeHtml(prog.progCode)} - ${escapeHtml(prog.progTitle)}
                        </h3>
                        <div class="flex flex-wrap gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                            <span class="flex items-center gap-1">
                                <i data-lucide="building-2" class="w-3 h-3"></i>
                                ${escapeHtml(prog.college || 'N/A')}
                            </span>
                            <span class="flex items-center gap-1">
                                <i data-lucide="map-pin" class="w-3 h-3"></i>
                                ${escapeHtml(prog.campus || 'N/A')}
                            </span>
                            <span class="flex items-center gap-1">
                                <i data-lucide="clock" class="w-3 h-3"></i>
                                ${escapeHtml(prog.mode || 'N/A')}
                            </span>
                        </div>
                        ${matchesHtml}
                        <div class="mt-4 flex gap-2">
                            <button onclick="window.viewProgrammeFromDeepSearch('${escapeHtml(prog.progCode)}')"
                                    class="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors inline-flex items-center gap-1">
                                <i data-lucide="eye" class="w-3 h-3"></i>
                                View Details
                            </button>
                            <button onclick="window.generateProgrammeFromDeepSearch('${escapeHtml(prog.progCode)}')"
                                    class="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors inline-flex items-center gap-1">
                                <i data-lucide="file-text" class="w-3 h-3"></i>
                                Generate Spec
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderModuleResult(mod) {
        const matchesHtml = mod.matches.map(match => `
            <div class="mt-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <div class="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                    Match in: ${escapeHtml(match.field)}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    ${match.snippet}
                </div>
            </div>
        `).join('');

        // Format level
        const levelMap = { 'LC': 'Certificate', 'LI': 'Intermediate', 'LH': 'Honours', 'LM': 'Masters', 'LD': 'Doctoral' };
        const levelText = levelMap[mod.level] || mod.level;

        return `
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
                <div class="flex items-start gap-4">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                        <i data-lucide="book-open" class="w-3 h-3 mr-1"></i>
                        Module
                    </span>
                    <div class="flex-1 min-w-0">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                            ${escapeHtml(mod.code)} - ${escapeHtml(mod.title)}
                        </h3>
                        <div class="flex flex-wrap gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                            <span class="flex items-center gap-1">
                                <i data-lucide="layers" class="w-3 h-3"></i>
                                ${escapeHtml(levelText)}
                            </span>
                            <span class="flex items-center gap-1">
                                <i data-lucide="award" class="w-3 h-3"></i>
                                ${mod.credits || 0} credits
                            </span>
                            <span class="flex items-center gap-1">
                                <i data-lucide="calendar" class="w-3 h-3"></i>
                                ${escapeHtml(mod.semester || 'N/A')}
                            </span>
                            <span class="flex items-center gap-1">
                                <i data-lucide="building-2" class="w-3 h-3"></i>
                                ${escapeHtml(mod.school || 'N/A')}
                            </span>
                        </div>
                        ${matchesHtml}
                        <div class="mt-4 flex gap-2">
                            <button onclick="window.viewModuleFromDeepSearch('${escapeHtml(mod.code)}')"
                                    class="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors inline-flex items-center gap-1">
                                <i data-lucide="eye" class="w-3 h-3"></i>
                                View Details
                            </button>
                            <button onclick="window.generateModuleFromDeepSearch('${escapeHtml(mod.code)}')"
                                    class="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors inline-flex items-center gap-1">
                                <i data-lucide="file-text" class="w-3 h-3"></i>
                                Generate Spec
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function showDeepSearchLoading() {
        const loading = document.getElementById('deep-search-loading');
        const spinner = document.getElementById('deep-search-spinner');
        const results = document.getElementById('deep-search-results');
        const emptyState = document.getElementById('deep-search-empty');
        const noResults = document.getElementById('deep-search-no-results');

        spinner?.classList.remove('hidden');

        // Only show loading skeleton if no results yet
        if (deepSearchState.offset === 0) {
            loading?.classList.remove('hidden');
            results?.classList.add('hidden');
        }

        emptyState?.classList.add('hidden');
        noResults?.classList.add('hidden');
    }

    function hideDeepSearchLoading() {
        const loading = document.getElementById('deep-search-loading');
        const spinner = document.getElementById('deep-search-spinner');
        const results = document.getElementById('deep-search-results');

        loading?.classList.add('hidden');
        spinner?.classList.add('hidden');
        results?.classList.remove('hidden');
    }

    function showDeepSearchEmptyState() {
        const emptyState = document.getElementById('deep-search-empty');
        const noResults = document.getElementById('deep-search-no-results');
        const results = document.getElementById('deep-search-results');
        const summary = document.getElementById('deep-search-summary');
        const loadMore = document.getElementById('deep-search-load-more');

        emptyState?.classList.remove('hidden');
        noResults?.classList.add('hidden');
        results && (results.innerHTML = '');
        summary?.classList.add('hidden');
        loadMore?.classList.add('hidden');
    }

    function showDeepSearchError(message) {
        const results = document.getElementById('deep-search-results');
        if (results) {
            results.innerHTML = `
                <div class="text-center py-8 text-red-600 dark:text-red-400">
                    <i data-lucide="alert-circle" class="w-12 h-12 mx-auto mb-4"></i>
                    <p>${escapeHtml(message)}</p>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Global functions for button handlers
    window.loadMoreDeepSearchResults = function() {
        deepSearchState.offset += deepSearchState.limit;
        performDeepSearch();
    };

    window.viewProgrammeFromDeepSearch = function(progCode) {
        // Switch to programmes tab and fill in the search
        const progSearchInput = document.getElementById('prog-search');
        if (progSearchInput) {
            // Find the Alpine.js component and switch tabs
            const tabContainer = document.querySelector('[x-data]');
            if (tabContainer && tabContainer.__x) {
                tabContainer.__x.$data.activeTab = 'programmes';
            }

            // Set the search value
            progSearchInput.value = progCode;
            progSearchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    };

    window.generateProgrammeFromDeepSearch = function(progCode) {
        // Switch to programmes tab
        const tabContainer = document.querySelector('[x-data]');
        if (tabContainer && tabContainer.__x) {
            tabContainer.__x.$data.activeTab = 'programmes';
        }

        // Fill in the search and trigger generation
        const progSearchInput = document.getElementById('prog-search');
        if (progSearchInput) {
            progSearchInput.value = progCode;
            progSearchInput.dispatchEvent(new Event('input', { bubbles: true }));

            // Wait a moment for autocomplete to populate, then alert user to complete selection
            setTimeout(() => {
                alert(`Programme ${progCode} selected. Please choose the Spec Type and Academic Year, then click Generate.`);
            }, 500);
        }
    };

    window.viewModuleFromDeepSearch = function(modCode) {
        // Switch to modules tab and fill in the search
        const modSearchInput = document.getElementById('mod-search');
        if (modSearchInput) {
            // Find the Alpine.js component and switch tabs
            const tabContainer = document.querySelector('[x-data]');
            if (tabContainer && tabContainer.__x) {
                tabContainer.__x.$data.activeTab = 'modules';
            }

            // Set the search value
            modSearchInput.value = modCode;
            modSearchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    };

    window.generateModuleFromDeepSearch = function(modCode) {
        // Switch to modules tab
        const tabContainer = document.querySelector('[x-data]');
        if (tabContainer && tabContainer.__x) {
            tabContainer.__x.$data.activeTab = 'modules';
        }

        // Fill in the search and trigger generation
        const modSearchInput = document.getElementById('mod-search');
        if (modSearchInput) {
            modSearchInput.value = modCode;
            modSearchInput.dispatchEvent(new Event('input', { bubbles: true }));

            // Wait a moment for autocomplete to populate, then alert user to complete selection
            setTimeout(() => {
                alert(`Module ${modCode} selected. Please choose the Academic Year, then click Generate.`);
            }, 500);
        }
    };
})();