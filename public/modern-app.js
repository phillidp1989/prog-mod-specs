// Modern App JavaScript
let progAutocompleteData = {};
let modAutocompleteData = {};
let recentProgrammes = [];
let recentModules = [];
let favorites = {
    programmes: [],
    modules: []
};

// Load favorites from localStorage
if (localStorage.getItem('favorites')) {
    favorites = JSON.parse(localStorage.getItem('favorites'));
}

// Load recent items from localStorage
if (localStorage.getItem('recentProgrammes')) {
    recentProgrammes = JSON.parse(localStorage.getItem('recentProgrammes'));
}
if (localStorage.getItem('recentModules')) {
    recentModules = JSON.parse(localStorage.getItem('recentModules'));
}

// Initialize autocomplete data
async function initializeAutocomplete() {
    try {
        // Load programme autocomplete data
        const progResponse = await axios.get('/autocomplete-data');
        progAutocompleteData = progResponse.data;
        
        // Setup programme autocomplete
        setupAutocomplete('prog-search', progAutocompleteData);
        
        // Load module autocomplete data
        const modResponse = await axios.get('/mod-autocomplete-data');
        modAutocompleteData = modResponse.data;
        
        // Setup module autocomplete
        setupAutocomplete('mod-search', modAutocompleteData);
    } catch (error) {
        console.error('Error loading autocomplete data:', error);
        showNotification('Error loading data. Please refresh the page.', 'error');
    }
}

// Setup autocomplete functionality
function setupAutocomplete(inputId, data) {
    const input = document.getElementById(inputId);
    const dataList = Object.keys(data);
    
    // Create dropdown container
    const dropdown = document.createElement('div');
    dropdown.className = 'absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg mt-1 max-h-60 overflow-auto hidden';
    dropdown.id = `${inputId}-dropdown`;
    input.parentElement.appendChild(dropdown);
    
    // Input event listener
    input.addEventListener('input', (e) => {
        const value = e.target.value.toLowerCase();
        if (value.length < 2) {
            dropdown.classList.add('hidden');
            return;
        }
        
        const filtered = dataList.filter(item => 
            item.toLowerCase().includes(value)
        ).slice(0, 10);
        
        if (filtered.length === 0) {
            dropdown.classList.add('hidden');
            return;
        }
        
        dropdown.innerHTML = filtered.map(item => `
            <div class="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-900 dark:text-gray-100" onclick="selectAutocomplete('${inputId}', '${item.replace(/'/g, "\\'")}')">${highlightMatch(item, value)}</div>
        `).join('');
        
        dropdown.classList.remove('hidden');
    });
    
    // Hide dropdown on click outside
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
}

// Highlight matching text
function highlightMatch(text, search) {
    const regex = new RegExp(`(${search})`, 'gi');
    return text.replace(regex, '<span class="font-semibold text-primary-600 dark:text-primary-400">$1</span>');
}

// Select autocomplete item
function selectAutocomplete(inputId, value) {
    document.getElementById(inputId).value = value;
    document.getElementById(`${inputId}-dropdown`).classList.add('hidden');
}

// Programme generate handler
document.getElementById('prog-generate-btn').addEventListener('click', async () => {
    const searchValue = document.getElementById('prog-search').value;
    const cohort = document.getElementById('cohort-select').value;
    const year = document.getElementById('year-select').value;
    
    if (!searchValue || !cohort || !year) {
        showNotification('Please fill in all fields', 'warning');
        return;
    }
    
    const progCode = searchValue.split(' - ')[0];
    
    showLoading(true);
    
    try {
        const response = await axios.get(`/prog-data/${progCode}/${cohort}/${year}`);
        const data = response.data;
        
        if (!data) {
            showNotification('Programme not found', 'error');
            showLoading(false);
            return;
        }
        
        // Add to recent programmes
        addToRecent('programmes', {
            code: progCode,
            title: data.progTitle,
            cohort: cohort,
            year: year,
            timestamp: new Date().toISOString()
        });
        
        // Generate document
        await generateProgrammeDoc(data, cohort, year);
        
        showLoading(false);
        showNotification('Specification generated successfully!', 'success');
    } catch (error) {
        console.error('Error generating specification:', error);
        showNotification('Error generating specification', 'error');
        showLoading(false);
    }
});

// Programme preview handler
document.getElementById('prog-preview-btn').addEventListener('click', async () => {
    const searchValue = document.getElementById('prog-search').value;
    const cohort = document.getElementById('cohort-select').value;
    const year = document.getElementById('year-select').value;
    
    if (!searchValue || !cohort || !year) {
        showNotification('Please fill in all fields', 'warning');
        return;
    }
    
    const progCode = searchValue.split(' - ')[0];
    
    showLoading(true);
    
    try {
        const response = await axios.get(`/prog-data/${progCode}/${cohort}/${year}`);
        const data = response.data;
        
        if (!data) {
            showNotification('Programme not found', 'error');
            showLoading(false);
            return;
        }
        
        // Store data for download from preview
        currentPreviewData = data;
        currentPreviewType = 'programme';
        currentPreviewYear = year;
        currentPreviewCohort = cohort;
        
        // Generate preview HTML
        const previewHtml = generateProgrammePreview(data, cohort, year);
        openPreview(previewHtml);
        
        showLoading(false);
    } catch (error) {
        console.error('Error loading preview:', error);
        showNotification('Error loading preview', 'error');
        showLoading(false);
    }
});

// Module generate handler
document.getElementById('mod-generate-btn').addEventListener('click', async () => {
    const searchValue = document.getElementById('mod-search').value;
    const year = document.getElementById('mod-year-select').value;
    const docType = document.getElementById('mod-type-select').value;
    
    if (!searchValue || !year) {
        showNotification('Please fill in all fields', 'warning');
        return;
    }
    
    const modCode = searchValue.substr(0, 5);
    
    showLoading(true);
    
    try {
        const response = await axios.get(`/mod-data/${modCode}/${year}`);
        const data = response.data;
        
        if (!data) {
            showNotification('Module not found', 'error');
            showLoading(false);
            return;
        }
        
        // Add to recent modules
        addToRecent('modules', {
            code: modCode,
            title: data.title,
            year: year,
            credits: data.credits,
            level: data.level,
            timestamp: new Date().toISOString()
        });
        
        // Generate document
        await generateModuleDoc(data, year, docType);
        
        showLoading(false);
        showNotification('Specification generated successfully!', 'success');
    } catch (error) {
        console.error('Error generating specification:', error);
        showNotification('Error generating specification', 'error');
        showLoading(false);
    }
});

// Module preview handler
document.getElementById('mod-preview-btn').addEventListener('click', async () => {
    const searchValue = document.getElementById('mod-search').value;
    const year = document.getElementById('mod-year-select').value;
    
    if (!searchValue || !year) {
        showNotification('Please fill in all fields', 'warning');
        return;
    }
    
    const modCode = searchValue.substr(0, 5);
    
    showLoading(true);
    
    try {
        const response = await axios.get(`/mod-data/${modCode}/${year}`);
        const data = response.data;
        
        if (!data) {
            showNotification('Module not found', 'error');
            showLoading(false);
            return;
        }
        
        // Store data for download from preview
        currentPreviewData = data;
        currentPreviewType = 'module';
        currentPreviewYear = year;
        currentPreviewDocType = document.getElementById('mod-type-select').value;
        
        // Generate preview HTML
        const previewHtml = generateModulePreview(data, year);
        openPreview(previewHtml);
        
        showLoading(false);
    } catch (error) {
        console.error('Error loading preview:', error);
        showNotification('Error loading preview', 'error');
        showLoading(false);
    }
});

// Generate programme preview HTML
function generateProgrammePreview(data, cohort, year) {
    // Helper function to render module table
    const renderModuleTable = (modules, title) => {
        if (!modules || modules.length === 0) return '';
        
        return `
            <div class="mb-4">
                <h5 class="font-medium text-gray-800 dark:text-gray-200 mb-2">${title}</h5>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead class="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Code</th>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Credits</th>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Level</th>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Semester</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            ${modules.map(mod => `
                                <tr>
                                    <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${mod.moduleCode || ''}</td>
                                    <td class="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">${mod.moduleTitle || ''}</td>
                                    <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${mod.moduleCredits || ''}</td>
                                    <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${mod.moduleLevel || ''}</td>
                                    <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${mod.moduleSemester || ''}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    };

    // Helper function to render year section
    const renderYearSection = (yearData, yearNum, exists) => {
        if (!exists || !yearData) return '';
        
        const hasCompulsory = yearData.rules && yearData.rules.compulsory && yearData.rules.compulsory.length > 0;
        const hasOptional = yearData.rules && yearData.rules.optional && yearData.rules.optional.length > 0;
        
        return `
            <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <button onclick="toggleSection('year${yearNum}')" class="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between transition-colors">
                    <div class="flex items-center space-x-3">
                        <i data-lucide="chevron-right" class="w-5 h-5 text-gray-500 transform transition-transform" id="year${yearNum}-icon"></i>
                        <span class="font-medium text-gray-900 dark:text-gray-100">Year ${yearNum}</span>
                    </div>
                </button>
                <div id="year${yearNum}-content" class="hidden p-4 bg-white dark:bg-gray-900">
                    ${yearData.yearText ? `<p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">${yearData.yearText}</p>` : ''}
                    
                    ${hasCompulsory ? `
                        <div class="mb-6">
                            <h5 class="font-semibold text-gray-800 dark:text-gray-200 mb-3">Compulsory Modules</h5>
                            ${yearData.rules.compulsory.map(rule => `
                                ${rule.ruleText ? `<p class="text-sm text-gray-600 dark:text-gray-400 mb-2 italic">${rule.ruleText}</p>` : ''}
                                ${rule.module && rule.module.length > 0 ? `
                                    <div class="overflow-x-auto mb-4">
                                        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead class="bg-gray-50 dark:bg-gray-800">
                                                <tr>
                                                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Code</th>
                                                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                                                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Credits</th>
                                                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Level</th>
                                                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Semester</th>
                                                </tr>
                                            </thead>
                                            <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                                ${rule.module.map(mod => `
                                                    <tr>
                                                        <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${mod.moduleCode || ''}</td>
                                                        <td class="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">${mod.moduleTitle || ''}</td>
                                                        <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${mod.moduleCredits || ''}</td>
                                                        <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${mod.moduleLevel || ''}</td>
                                                        <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${mod.moduleSemester || ''}</td>
                                                    </tr>
                                                `).join('')}
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
                                ${rule.ruleText ? `<p class="text-sm text-gray-600 dark:text-gray-400 mb-2 italic">${rule.ruleText}</p>` : ''}
                                ${rule.module && rule.module.length > 0 ? `
                                    <div class="overflow-x-auto mb-4">
                                        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead class="bg-gray-50 dark:bg-gray-800">
                                                <tr>
                                                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Code</th>
                                                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                                                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Credits</th>
                                                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Level</th>
                                                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Semester</th>
                                                </tr>
                                            </thead>
                                            <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                                ${rule.module.map(mod => `
                                                    <tr>
                                                        <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${mod.moduleCode || ''}</td>
                                                        <td class="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">${mod.moduleTitle || ''}</td>
                                                        <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${mod.moduleCredits || ''}</td>
                                                        <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${mod.moduleLevel || ''}</td>
                                                        <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${mod.moduleSemester || ''}</td>
                                                    </tr>
                                                `).join('')}
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
        <div class="space-y-6 max-h-[80vh] overflow-y-auto p-1">
            <!-- Header -->
            <div class="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900 dark:to-primary-800 p-6 rounded-lg">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">${data.progTitle || 'Programme Title'}</h2>
                <p class="text-lg text-gray-700 dark:text-gray-300 mt-2">Programme Code: ${data.progCode || 'N/A'}</p>
                ${data.shortTitle ? `<p class="text-md text-gray-600 dark:text-gray-400">Short Title: ${data.shortTitle}</p>` : ''}
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    <div class="bg-white/50 dark:bg-gray-800/50 rounded-lg px-3 py-2 text-center">
                        <p class="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">Academic Year</p>
                        <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">${year}/${parseInt(year) + 1}</p>
                    </div>
                    <div class="bg-white/50 dark:bg-gray-800/50 rounded-lg px-3 py-2 text-center">
                        <p class="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">Spec Type</p>
                        <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">${cohort === 'cohort' ? 'Cohort' : 'Academic Year'}</p>
                    </div>
                    ${data.mode ? `
                    <div class="bg-white/50 dark:bg-gray-800/50 rounded-lg px-3 py-2 text-center">
                        <p class="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">Mode</p>
                        <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">${data.mode}</p>
                    </div>
                    ` : ''}
                    ${data.campus ? `
                    <div class="bg-white/50 dark:bg-gray-800/50 rounded-lg px-3 py-2 text-center">
                        <p class="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">Campus</p>
                        <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">${data.campus}</p>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- Core Details Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-white dark:bg-gray-700 p-4 rounded-lg">
                    <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-3">Programme Details</h3>
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
                
                <div class="bg-white dark:bg-gray-700 p-4 rounded-lg">
                    <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-3">Additional Information</h3>
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
            <div class="bg-white dark:bg-gray-700 p-4 rounded-lg">
                <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-3">Programme Aims</h3>
                <ul class="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                    ${Array.isArray(data.aims) ? data.aims.map(aim => `<li>${aim}</li>`).join('') : `<li>${data.aims}</li>`}
                </ul>
            </div>
            ` : ''}
            
            <!-- Learning Outcomes Section -->
            ${(data.knowledge && (data.knowledge.outcome || data.knowledge.learning || data.knowledge.assessment)) || 
              (data.skills && (data.skills.outcome || data.skills.learning || data.skills.assessment)) ? `
            <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <button onclick="toggleSection('outcomes')" class="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between transition-colors">
                    <div class="flex items-center space-x-3">
                        <i data-lucide="chevron-right" class="w-5 h-5 text-gray-500 transform transition-transform" id="outcomes-icon"></i>
                        <span class="font-medium text-gray-900 dark:text-gray-100">Learning Outcomes</span>
                    </div>
                </button>
                <div id="outcomes-content" class="hidden p-4 bg-white dark:bg-gray-900 space-y-4">
                    ${data.knowledge ? `
                    <div>
                        <h4 class="font-medium text-gray-900 dark:text-gray-100 mb-2">Knowledge and Understanding</h4>
                        ${data.knowledge.outcome && data.knowledge.outcome.length > 0 ? `
                        <div class="mb-3">
                            <h5 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Outcomes:</h5>
                            <ul class="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                ${data.knowledge.outcome.map(item => `<li>${item}</li>`).join('')}
                            </ul>
                        </div>
                        ` : ''}
                        ${data.knowledge.learning && data.knowledge.learning.length > 0 ? `
                        <div class="mb-3">
                            <h5 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Learning Methods:</h5>
                            <ul class="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                ${data.knowledge.learning.map(item => `<li>${item}</li>`).join('')}
                            </ul>
                        </div>
                        ` : ''}
                        ${data.knowledge.assessment && data.knowledge.assessment.length > 0 ? `
                        <div>
                            <h5 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assessment:</h5>
                            <ul class="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                ${data.knowledge.assessment.map(item => `<li>${item}</li>`).join('')}
                            </ul>
                        </div>
                        ` : ''}
                    </div>
                    ` : ''}
                    
                    ${data.skills ? `
                    <div>
                        <h4 class="font-medium text-gray-900 dark:text-gray-100 mb-2">Skills and Other Attributes</h4>
                        ${data.skills.outcome && data.skills.outcome.length > 0 ? `
                        <div class="mb-3">
                            <h5 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Outcomes:</h5>
                            <ul class="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                ${data.skills.outcome.map(item => `<li>${item}</li>`).join('')}
                            </ul>
                        </div>
                        ` : ''}
                        ${data.skills.learning && data.skills.learning.length > 0 ? `
                        <div class="mb-3">
                            <h5 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Learning Methods:</h5>
                            <ul class="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                ${data.skills.learning.map(item => `<li>${item}</li>`).join('')}
                            </ul>
                        </div>
                        ` : ''}
                        ${data.skills.assessment && data.skills.assessment.length > 0 ? `
                        <div>
                            <h5 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assessment:</h5>
                            <ul class="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                ${data.skills.assessment.map(item => `<li>${item}</li>`).join('')}
                            </ul>
                        </div>
                        ` : ''}
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}
            
            <!-- Year Sections -->
            <div class="space-y-3">
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
            <div class="bg-white dark:bg-gray-700 p-4 rounded-lg">
                <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-3">Benchmark Statement</h3>
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
function generateModulePreview(data, year) {
    // Helper function to calculate total hours
    const calculateTotalHours = () => {
        const hours = [
            data.lecture, data.seminar, data.tutorial, data.project,
            data.demo, data.practical, data.workshop, data.fieldwork,
            data.visits, data.work, data.placement, data.abroad, data.independent
        ].filter(h => h && !isNaN(parseInt(h)));
        return hours.reduce((sum, h) => sum + parseInt(h), 0);
    };

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
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead class="bg-gray-50 dark:bg-gray-800">
                    <tr>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                        <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hours</th>
                    </tr>
                </thead>
                <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    ${contactTypes.map(item => `
                        <tr>
                            <td class="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">${item.label}</td>
                            <td class="px-3 py-2 text-sm text-gray-900 dark:text-gray-100 text-right font-medium">${item.value}</td>
                        </tr>
                    `).join('')}
                    <tr class="bg-gray-50 dark:bg-gray-800 font-bold">
                        <td class="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">Total</td>
                        <td class="px-3 py-2 text-sm text-gray-900 dark:text-gray-100 text-right">${calculateTotalHours()}</td>
                    </tr>
                </tbody>
            </table>
        `;
    };

    return `
        <div class="space-y-6 max-h-[80vh] overflow-y-auto p-1">
            <!-- Header -->
            <div class="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900 dark:to-primary-800 p-6 rounded-lg">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">${data.title || 'Module Title'}</h2>
                <p class="text-lg text-gray-700 dark:text-gray-300 mt-2">Module Code: ${data.code || 'N/A'}</p>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    <div class="bg-white/50 dark:bg-gray-800/50 rounded-lg px-3 py-2 text-center">
                        <p class="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">Academic Year</p>
                        <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">${year}/${parseInt(year) + 1}</p>
                    </div>
                    <div class="bg-white/50 dark:bg-gray-800/50 rounded-lg px-3 py-2 text-center">
                        <p class="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">Credits</p>
                        <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">${data.credits || '0'}</p>
                    </div>
                    <div class="bg-white/50 dark:bg-gray-800/50 rounded-lg px-3 py-2 text-center">
                        <p class="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">Level</p>
                        <p class="text-sm font-semibold ${
                            data.level === 'LC' || data.level === 'C' ? 'text-yellow-600 dark:text-yellow-400' :
                            data.level === 'LI' || data.level === 'I' ? 'text-blue-600 dark:text-blue-400' :
                            data.level === 'LH' || data.level === 'H' ? 'text-green-600 dark:text-green-400' :
                            data.level === 'LM' || data.level === 'M' ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
                        }">${data.level || 'N/A'}</p>
                    </div>
                    ${data.semester ? `
                    <div class="bg-white/50 dark:bg-gray-800/50 rounded-lg px-3 py-2 text-center">
                        <p class="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">Semester</p>
                        <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">${data.semester}</p>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- Core Details Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-white dark:bg-gray-700 p-4 rounded-lg">
                    <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-3">Module Details</h3>
                    <dl class="space-y-2">
                        <div class="flex justify-between">
                            <dt class="text-gray-600 dark:text-gray-400">School:</dt>
                            <dd class="text-gray-900 dark:text-gray-100 font-medium text-right">${data.school || 'N/A'}</dd>
                        </div>
                        <div class="flex justify-between">
                            <dt class="text-gray-600 dark:text-gray-400">Department:</dt>
                            <dd class="text-gray-900 dark:text-gray-100 font-medium text-right">${data.dept || 'N/A'}</dd>
                        </div>
                        <div class="flex justify-between">
                            <dt class="text-gray-600 dark:text-gray-400">Semester:</dt>
                            <dd class="text-gray-900 dark:text-gray-100 font-medium text-right">${data.semester || 'N/A'}</dd>
                        </div>
                        <div class="flex justify-between">
                            <dt class="text-gray-600 dark:text-gray-400">Campus:</dt>
                            <dd class="text-gray-900 dark:text-gray-100 font-medium text-right">${data.campus || 'N/A'}</dd>
                        </div>
                        ${data.lead ? `
                        <div class="flex justify-between">
                            <dt class="text-gray-600 dark:text-gray-400">Module Lead:</dt>
                            <dd class="text-gray-900 dark:text-gray-100 font-medium text-right">${data.lead}</dd>
                        </div>
                        ` : ''}
                    </dl>
                </div>
                
                <div class="bg-white dark:bg-gray-700 p-4 rounded-lg">
                    <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-3">Additional Information</h3>
                    <dl class="space-y-2">
                        ${data.prereqs ? `
                        <div class="flex justify-between">
                            <dt class="text-gray-600 dark:text-gray-400">Prerequisites:</dt>
                            <dd class="text-gray-900 dark:text-gray-100 font-medium text-right">${data.prereqs}</dd>
                        </div>
                        ` : ''}
                        ${data.coreqs ? `
                        <div class="flex justify-between">
                            <dt class="text-gray-600 dark:text-gray-400">Co-requisites:</dt>
                            <dd class="text-gray-900 dark:text-gray-100 font-medium text-right">${data.coreqs}</dd>
                        </div>
                        ` : ''}
                        ${data.examPeriod ? `
                        <div class="flex justify-between">
                            <dt class="text-gray-600 dark:text-gray-400">Exam Period:</dt>
                            <dd class="text-gray-900 dark:text-gray-100 font-medium text-right">${data.examPeriod}</dd>
                        </div>
                        ` : ''}
                        ${data.ctExam ? `
                        <div class="flex justify-between">
                            <dt class="text-gray-600 dark:text-gray-400">Class Test:</dt>
                            <dd class="text-gray-900 dark:text-gray-100 font-medium text-right">${data.ctExam}</dd>
                        </div>
                        ` : ''}
                    </dl>
                </div>
            </div>
            
            <!-- Contact Hours Breakdown -->
            <div class="bg-white dark:bg-gray-700 p-4 rounded-lg">
                <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-3">Contact Hours Breakdown</h3>
                <div class="overflow-x-auto">
                    ${renderContactHours()}
                </div>
            </div>
            
            <!-- Module Content Sections -->
            ${data.description ? `
            <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <button onclick="toggleSection('description')" class="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between transition-colors">
                    <div class="flex items-center space-x-3">
                        <i data-lucide="chevron-right" class="w-5 h-5 text-gray-500 transform transition-transform" id="description-icon"></i>
                        <span class="font-medium text-gray-900 dark:text-gray-100">Module Description</span>
                    </div>
                </button>
                <div id="description-content" class="hidden p-4 bg-white dark:bg-gray-900">
                    <div class="text-gray-700 dark:text-gray-300">${data.description}</div>
                </div>
            </div>
            ` : ''}
            
            ${data.outcomes && data.outcomes.length > 0 ? `
            <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <button onclick="toggleSection('outcomes-mod')" class="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between transition-colors">
                    <div class="flex items-center space-x-3">
                        <i data-lucide="chevron-right" class="w-5 h-5 text-gray-500 transform transition-transform" id="outcomes-mod-icon"></i>
                        <span class="font-medium text-gray-900 dark:text-gray-100">Learning Outcomes</span>
                    </div>
                </button>
                <div id="outcomes-mod-content" class="hidden p-4 bg-white dark:bg-gray-900">
                    <div class="text-gray-700 dark:text-gray-300">
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
            <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <button onclick="toggleSection('assessment')" class="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between transition-colors">
                    <div class="flex items-center space-x-3">
                        <i data-lucide="chevron-right" class="w-5 h-5 text-gray-500 transform transition-transform" id="assessment-icon"></i>
                        <span class="font-medium text-gray-900 dark:text-gray-100">Assessment Methods</span>
                    </div>
                </button>
                <div id="assessment-content" class="hidden p-4 bg-white dark:bg-gray-900">
                    <div class="text-gray-700 dark:text-gray-300">
                        <h4 class="font-medium text-gray-900 dark:text-gray-100 mb-2">Summative Assessment</h4>
                        <p class="mb-4">${data.summative}</p>
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
            <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <button onclick="toggleSection('programmes')" class="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between transition-colors">
                    <div class="flex items-center space-x-3">
                        <i data-lucide="chevron-right" class="w-5 h-5 text-gray-500 transform transition-transform" id="programmes-icon"></i>
                        <span class="font-medium text-gray-900 dark:text-gray-100">Attached Programmes</span>
                        <span class="badge badge-primary">${(data.attachedProgs.comp?.length || 0) + (data.attachedProgs.optional?.length || 0)} programmes</span>
                    </div>
                </button>
                <div id="programmes-content" class="hidden p-4 bg-white dark:bg-gray-900">
                    ${data.attachedProgs.comp?.length > 0 ? `
                    <div class="mb-4">
                        <h4 class="font-medium text-gray-900 dark:text-gray-100 mb-2">Compulsory for:</h4>
                        <ul class="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            ${data.attachedProgs.comp.map(prog => 
                                typeof prog === 'string' ? `<li>${prog}</li>` : `<li>${prog.progCode} - ${prog.progTitle}</li>`
                            ).join('')}
                        </ul>
                    </div>
                    ` : ''}
                    ${data.attachedProgs.optional?.length > 0 ? `
                    <div>
                        <h4 class="font-medium text-gray-900 dark:text-gray-100 mb-2">Optional for:</h4>
                        <ul class="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            ${data.attachedProgs.optional.map(prog => 
                                typeof prog === 'string' ? `<li>${prog}</li>` : `<li>${prog.progCode} - ${prog.progTitle}</li>`
                            ).join('')}
                        </ul>
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
async function generateProgrammeDoc(data, cohort, year) {
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
async function generateModuleDoc(data, year, docType) {
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

// Utility function to load file
function loadFile(url, callback) {
    PizZipUtils.getBinaryContent(url, callback);
}

// Add to recent items
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
    
    // Save to localStorage
    localStorage.setItem(type === 'programmes' ? 'recentProgrammes' : 'recentModules', JSON.stringify(recentList));
}

// Show loading overlay
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };
    
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-up`;
    notification.innerHTML = `
        <div class="flex items-center space-x-2">
            <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info'}" class="w-5 h-5"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    lucide.createIcons();
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Add to favorites handler for programmes
document.getElementById('prog-favorite-btn').addEventListener('click', () => {
    const searchValue = document.getElementById('prog-search').value;
    const cohort = document.getElementById('cohort-select').value;
    const year = document.getElementById('year-select').value;
    
    if (!searchValue) {
        showNotification('Please select a programme first', 'warning');
        return;
    }
    
    const progCode = searchValue.split(' - ')[0];
    const progTitle = searchValue.split(' - ')[1] || '';
    
    const favoriteItem = {
        code: progCode,
        title: progTitle,
        cohort: cohort,
        year: year,
        timestamp: new Date().toISOString()
    };
    
    // Check if already in favorites
    const existingIndex = favorites.programmes.findIndex(f => f.code === progCode);
    if (existingIndex > -1) {
        // Remove from favorites
        favorites.programmes.splice(existingIndex, 1);
        document.getElementById('prog-favorite-btn').innerHTML = `
            <i data-lucide="star" class="w-4 h-4"></i>
            <span>Add to Favorites</span>
        `;
        showNotification('Removed from favorites', 'info');
    } else {
        // Add to favorites
        favorites.programmes.push(favoriteItem);
        document.getElementById('prog-favorite-btn').innerHTML = `
            <i data-lucide="star" class="w-4 h-4 fill-current"></i>
            <span>Remove from Favorites</span>
        `;
        showNotification('Added to favorites!', 'success');
    }
    
    // Save to localStorage
    localStorage.setItem('favorites', JSON.stringify(favorites));
    lucide.createIcons();
});

// Add to favorites handler for modules
document.getElementById('mod-favorite-btn').addEventListener('click', () => {
    const searchValue = document.getElementById('mod-search').value;
    const year = document.getElementById('mod-year-select').value;
    
    if (!searchValue) {
        showNotification('Please select a module first', 'warning');
        return;
    }
    
    const modCode = searchValue.substr(0, 5);
    const modTitle = searchValue.split(' - ')[1] || '';
    
    const favoriteItem = {
        code: modCode,
        title: modTitle,
        year: year,
        timestamp: new Date().toISOString()
    };
    
    // Check if already in favorites
    const existingIndex = favorites.modules.findIndex(f => f.code === modCode);
    if (existingIndex > -1) {
        // Remove from favorites
        favorites.modules.splice(existingIndex, 1);
        document.getElementById('mod-favorite-btn').innerHTML = `
            <i data-lucide="star" class="w-4 h-4"></i>
            <span>Add to Favorites</span>
        `;
        showNotification('Removed from favorites', 'info');
    } else {
        // Add to favorites
        favorites.modules.push(favoriteItem);
        document.getElementById('mod-favorite-btn').innerHTML = `
            <i data-lucide="star" class="w-4 h-4 fill-current"></i>
            <span>Remove from Favorites</span>
        `;
        showNotification('Added to favorites!', 'success');
    }
    
    // Save to localStorage
    localStorage.setItem('favorites', JSON.stringify(favorites));
    lucide.createIcons();
});

// Check if current selection is in favorites
function checkFavoriteStatus() {
    const progSearch = document.getElementById('prog-search').value;
    if (progSearch) {
        const progCode = progSearch.split(' - ')[0];
        const isFavorite = favorites.programmes.some(f => f.code === progCode);
        document.getElementById('prog-favorite-btn').innerHTML = isFavorite ? `
            <i data-lucide="star" class="w-4 h-4 fill-current"></i>
            <span>Remove from Favorites</span>
        ` : `
            <i data-lucide="star" class="w-4 h-4"></i>
            <span>Add to Favorites</span>
        `;
    }
    
    const modSearch = document.getElementById('mod-search').value;
    if (modSearch) {
        const modCode = modSearch.substr(0, 5);
        const isFavorite = favorites.modules.some(f => f.code === modCode);
        document.getElementById('mod-favorite-btn').innerHTML = isFavorite ? `
            <i data-lucide="star" class="w-4 h-4 fill-current"></i>
            <span>Remove from Favorites</span>
        ` : `
            <i data-lucide="star" class="w-4 h-4"></i>
            <span>Add to Favorites</span>
        `;
    }
    lucide.createIcons();
}

// Add event listeners to check favorite status on input change
document.getElementById('prog-search').addEventListener('change', checkFavoriteStatus);
document.getElementById('mod-search').addEventListener('change', checkFavoriteStatus);

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
    
    showLoading(true);
    
    try {
        if (currentPreviewType === 'programme') {
            await generateProgrammeDoc(currentPreviewData, currentPreviewCohort, currentPreviewYear);
        } else if (currentPreviewType === 'module') {
            await generateModuleDoc(currentPreviewData, currentPreviewYear, currentPreviewDocType);
        }
        showNotification('Specification downloaded successfully!', 'success');
    } catch (error) {
        console.error('Error downloading specification:', error);
        showNotification('Error downloading specification', 'error');
    } finally {
        showLoading(false);
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeAutocomplete();
    checkFavoriteStatus();
});