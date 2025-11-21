# Bulk Specification Generation - Implementation Guide

## Overview

This document provides comprehensive instructions for implementing multi-select bulk document generation in the Catalogue feature, allowing users to select multiple programmes or modules and download their specifications as a single ZIP file.

## Feature Requirements

### User Requirements
- **Maximum Selection**: 25 documents per bulk operation
- **Select All Filtered**: Option to select all items matching current filters (up to 25)
- **Error Handling**: Skip failed items and continue processing remaining documents
- **Selection Persistence**: Keep selections when navigating pages or changing filters

### Technical Requirements
- Client-side document generation using existing docxtemplater infrastructure
- Sequential processing with progress indication
- ZIP file creation using JSZip library
- No backend modifications required (optional batch endpoint can be added later)

## Architecture Overview

### Current System
```
User clicks card → Expand preview → Click "Generate Document"
                                   ↓
                           fetchProgrammeSpecData(code, cohort, year)
                                   ↓
                           generateProgrammeDoc(data, cohort, year)
                                   ↓
                           loadFile(template) → docxtemplater → saveAs(blob)
```

### New Bulk System
```
User selects multiple cards → Click "Generate Selected (ZIP)"
                                   ↓
                           Loop through selected codes:
                             - fetchSpecData(code, params)
                             - generateDocBlob(data, params)
                             - zip.file(filename, blob)
                                   ↓
                           zip.generateAsync() → saveAs(zipBlob)
```

### Key Differences
- **Single**: Direct download of one .docx file
- **Bulk**: Sequential generation → add to ZIP → download one .zip file
- **Progress**: Bulk shows modal with progress bar and current item
- **Errors**: Bulk continues on failure, shows summary at end

## Implementation Phases

---

## Phase 1: Dependencies & State Setup

### 1.1 Install JSZip Library

**Option A: npm (Recommended)**

```bash
cd /Volumes/CORP/AS/PS_Share/Curriculum\ Management\ Team/Downloadable-Specs/prog-mod-specs
npm install jszip@^3.10.1
```

**Option B: CDN**

Add to `/public/index-modern.html` (around line 1760, after other libraries):

```html
<!-- JSZip for bulk document generation -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
```

**Verification:**

After installation, test in browser console:
```javascript
console.log(typeof JSZip); // Should output "function"
```

### 1.2 Update Catalogue State

**File**: `/public/modern-app.js`
**Location**: Line ~5307 (inside `window.catalogueState` object)

**Add these properties:**

```javascript
window.catalogueState = {
    type: 'programmes', // 'programmes' or 'modules'
    currentPage: 1,
    itemsPerPage: 30,
    sortBy: 'title',
    sortOrder: 'asc',
    searchQuery: '',
    totalItems: 0,
    allData: [],
    filteredData: [],
    displayData: [],
    isLoading: false,
    fuseInstance: null,
    expandedCardId: null,
    selectedCohortType: 'cohort',
    selectedProgrammeYear: '2025',
    selectedModuleYear: '2025',

    // NEW: Bulk generation properties
    selectedItems: new Set(),        // Set of selected item codes (prog/mod codes)
    selectionMode: false,            // Boolean: is selection mode active?
    maxSelection: 25,                // Maximum items that can be selected
    bulkGenerationInProgress: false  // Prevent duplicate bulk operations
};
```

**Testing:**
```javascript
// In browser console after page load
console.log(window.catalogueState.selectedItems); // Should be empty Set
console.log(window.catalogueState.maxSelection);  // Should be 25
```

---

## Phase 2: UI Components

### 2.1 Add Selection Toolbar

**File**: `/public/index-modern.html`
**Location**: After the module parameter selector (line ~1212), before "Search and Controls Bar"

**Insert this HTML:**

```html
<!-- Bulk Actions Toolbar -->
<div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
        <!-- Left: Selection Mode Toggle -->
        <div class="flex items-center gap-3">
            <button id="toggle-selection-mode"
                    onclick="window.toggleSelectionMode()"
                    class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center gap-2">
                <i data-lucide="check-square" class="w-4 h-4"></i>
                <span id="selection-mode-text">Select Multiple</span>
            </button>

            <!-- Selection Count Badge (hidden by default) -->
            <span id="selection-count-badge"
                  class="hidden px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium">
                0 selected
            </span>
        </div>

        <!-- Right: Bulk Actions (hidden until items selected) -->
        <div id="bulk-actions" class="hidden flex flex-wrap items-center gap-2">
            <button onclick="window.selectAllFiltered()"
                    class="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm">
                <i data-lucide="list-checks" class="w-4 h-4 inline mr-1"></i>
                Select All Filtered (max 25)
            </button>
            <button onclick="window.clearSelection()"
                    class="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm">
                <i data-lucide="x" class="w-4 h-4 inline mr-1"></i>
                Clear Selection
            </button>
            <button id="generate-bulk-btn"
                    onclick="window.generateBulkDocuments()"
                    class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium">
                <i data-lucide="download" class="w-4 h-4"></i>
                Generate Selected (ZIP)
            </button>
        </div>
    </div>
</div>
```

**After adding, run in browser console:**
```javascript
// Check elements are added
document.getElementById('toggle-selection-mode');
document.getElementById('bulk-actions');
lucide.createIcons(); // Re-initialize icons
```

### 2.2 Add Progress Modal

**File**: `/public/index-modern.html`
**Location**: Before closing `</body>` tag (around line 1800)

**Insert this HTML:**

```html
<!-- Bulk Generation Progress Modal -->
<div id="bulk-progress-modal" class="hidden fixed inset-0 bg-gray-900 bg-opacity-75 z-[100] flex items-center justify-center p-4">
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full">
        <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <i data-lucide="loader" class="w-5 h-5 animate-spin text-primary-600"></i>
            Generating Documents
        </h3>

        <!-- Progress Bar -->
        <div class="mb-4">
            <div class="flex justify-between text-sm mb-2">
                <span id="bulk-progress-text" class="text-gray-600 dark:text-gray-400">
                    Processing 1 of 23...
                </span>
                <span id="bulk-progress-percent" class="text-primary-600 dark:text-primary-400 font-semibold">
                    4%
                </span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <div id="bulk-progress-bar"
                     class="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-300 ease-out"
                     style="width: 0%"></div>
            </div>
        </div>

        <!-- Current Item -->
        <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 mb-4 border border-gray-200 dark:border-gray-700">
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Current Item:</p>
            <p id="bulk-current-item" class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                H600 - BSc Computer Science
            </p>
        </div>

        <!-- Status Messages -->
        <div id="bulk-status-messages" class="mb-4 text-xs text-gray-600 dark:text-gray-400">
            <p>This may take a few minutes. Please do not close this window.</p>
        </div>

        <!-- Cancel Button -->
        <button id="bulk-cancel-btn"
                onclick="window.cancelBulkGeneration()"
                class="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium">
            <i data-lucide="x-circle" class="w-4 h-4 inline mr-2"></i>
            Cancel Generation
        </button>
    </div>
</div>
```

**After adding:**
```javascript
lucide.createIcons(); // Re-initialize Lucide icons
```

### 2.3 Update Card Rendering

**File**: `/public/modern-app.js`
**Location**: Lines 6126-6163 (`renderProgrammeCard` function) and 6165-6200 (`renderModuleCard` function)

**Replace `renderProgrammeCard` function with:**

```javascript
/**
 * Render a programme card (wrapper only, content managed separately for animation)
 */
function renderProgrammeCard(prog) {
    const cardId = `catalogue-card-prog-${prog.code}`;
    const isSelected = catalogueState.selectedItems.has(prog.code);

    // Selection checkbox (only visible in selection mode)
    const checkbox = catalogueState.selectionMode ? `
        <div class="absolute top-3 left-3 z-10 bg-white dark:bg-gray-800 rounded-md p-1.5 shadow-md border border-gray-200 dark:border-gray-600"
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

    return `
        <div id="${cardId}"
             class="catalogue-card ${cursorClass} ${selectionClasses}"
             data-item='${JSON.stringify(prog).replace(/'/g, "&#39;")}'
             data-type="programme"
             onclick="${clickHandler}">
            ${checkbox}
            ${getProgrammeCardContent(prog, false)}
        </div>
    `;
}
```

**Replace `renderModuleCard` function with:**

```javascript
/**
 * Render a module card (wrapper only, content managed separately for animation)
 */
function renderModuleCard(mod) {
    const cardId = `catalogue-card-mod-${mod.code}`;
    const isSelected = catalogueState.selectedItems.has(mod.code);

    // Selection checkbox (only visible in selection mode)
    const checkbox = catalogueState.selectionMode ? `
        <div class="absolute top-3 left-3 z-10 bg-white dark:bg-gray-800 rounded-md p-1.5 shadow-md border border-gray-200 dark:border-gray-600"
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

    return `
        <div id="${cardId}"
             class="catalogue-card ${cursorClass} ${selectionClasses}"
             data-item='${JSON.stringify(mod).replace(/'/g, "&#39;")}'
             data-type="module"
             onclick="${clickHandler}">
            ${checkbox}
            ${getModuleCardContent(mod, false)}
        </div>
    `;
}
```

**Key Changes:**
- Added `isSelected` check using `catalogueState.selectedItems.has(code)`
- Added checkbox HTML (only when `selectionMode` is true)
- Added selection ring/background styling when selected
- Changed cursor style based on selection mode
- Disabled card click expansion when in selection mode
- Used `event.stopPropagation()` on checkbox to prevent card clicks

---

## Phase 3: Selection Logic

### 3.1 Core Selection Functions

**File**: `/public/modern-app.js`
**Location**: After `updateModuleCatalogueYear` function (around line 6370)

**Add these functions:**

```javascript
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
```

**Testing:**
```javascript
// In browser console:
window.toggleSelectionMode(); // Should toggle mode
window.toggleItemSelection('H600', true); // Should add to set
console.log(catalogueState.selectedItems); // Should show Set with 'H600'
window.clearSelection(); // Should empty the set
```

---

## Phase 4: Bulk Document Generation

### 4.1 Refactor Existing Generation Functions

**File**: `/public/modern-app.js`
**Location**: Around line 1980, after existing `generateProgrammeDoc` and `generateModuleDoc` functions

**Add these new blob-returning functions:**

```javascript
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
        const docPath = cohort === 'cohort'
            ? `/speccohort${year}.docx`
            : `/specterm${year}.docx`;

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

                const transformedData = window.transformProgrammeData(data, cohort, year);
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
async function generateModuleDocBlob(data, year, docType = 'spec') {
    return new Promise((resolve, reject) => {
        const docPath = docType === 'spec+' ? `/module-spec+.docx` : `/module-spec.docx`;

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

                const transformedData = window.transformModuleData(data, year);
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
```

### 4.2 Main Bulk Generation Function

**File**: `/public/modern-app.js`
**Location**: After the blob generation functions (around line 2080)

**Add these functions:**

```javascript
/**
 * Global flag to track if bulk generation is cancelled
 */
let bulkGenerationCancelled = false;

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

    // Confirm if large selection
    if (selectedCodes.length > 10) {
        const confirmMsg = `Generate ${selectedCodes.length} documents?\n\n` +
                          `This may take ${Math.ceil(selectedCodes.length * 2 / 60)} minutes.\n\n` +
                          `The ZIP file will be approximately ${Math.round(selectedCodes.length * 0.5)}MB.`;

        if (!confirm(confirmMsg)) {
            return;
        }
    }

    // Initialize
    catalogueState.bulkGenerationInProgress = true;
    bulkGenerationCancelled = false;

    // Show progress modal
    showBulkProgressModal();

    const zip = new JSZip();
    const successItems = [];
    const failedItems = [];

    try {
        // Process each selected item sequentially
        for (let i = 0; i < selectedCodes.length; i++) {
            // Check for cancellation
            if (bulkGenerationCancelled) {
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
        if (!bulkGenerationCancelled && successItems.length > 0) {
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

        } else if (!bulkGenerationCancelled) {
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
    }
};

/**
 * Cancel ongoing bulk generation
 */
window.cancelBulkGeneration = function() {
    if (catalogueState.bulkGenerationInProgress) {
        bulkGenerationCancelled = true;
        console.log('Cancelling bulk generation...');
    }
};

/**
 * Show bulk progress modal
 */
function showBulkProgressModal() {
    const modal = document.getElementById('bulk-progress-modal');
    if (modal) {
        modal.classList.remove('hidden');
        // Re-initialize icons in modal
        lucide.createIcons();
    }
}

/**
 * Hide bulk progress modal
 */
function hideBulkProgressModal() {
    const modal = document.getElementById('bulk-progress-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * Update bulk progress display
 * @param {number} current - Current item number (1-based)
 * @param {number} total - Total items
 * @param {string} itemName - Current item name/code
 * @param {number} percent - Progress percentage
 */
function updateBulkProgress(current, total, itemName, percent) {
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
 * Show generation summary modal/alert
 * @param {number} successCount - Number of successful generations
 * @param {Array} failedItems - Array of {code, error} objects
 */
function showBulkGenerationSummary(successCount, failedItems) {
    let message = `✓ Successfully generated ${successCount} document${successCount !== 1 ? 's' : ''}`;

    if (failedItems.length > 0) {
        message += `\n\n✗ Failed (${failedItems.length}):\n`;
        message += failedItems.map(f => `  • ${f.code}: ${f.error}`).join('\n');
    }

    // Use alert for now (can be replaced with nicer modal later)
    alert(message);

    // Also show notification
    if (successCount > 0) {
        window.showNotification?.(
            `Generated ${successCount} document${successCount !== 1 ? 's' : ''}`,
            'success'
        );
    }
}
```

**Key Features:**
- Sequential processing (one at a time)
- Progress tracking with percentage
- Error handling (skip failed, continue processing)
- Cancellation support
- ZIP file creation with proper naming
- Summary of successes/failures

---

## Phase 5: Integration & Testing

### 5.1 Preserve Selections Across Navigation

**File**: `/public/modern-app.js`
**Functions to modify**:
- `applyProgrammeCatalogueFilters()` (line ~5631)
- `applyModuleCatalogueFilters()` (line ~5703)
- `renderCatalogue()` (line ~5762)

**Important**: Do NOT clear `catalogueState.selectedItems` in these functions.

**In `renderCatalogue()`, ensure selections persist:**

```javascript
function renderCatalogue() {
    // ... existing code ...

    // DO NOT CLEAR SELECTIONS:
    // catalogueState.selectedItems.clear(); // ❌ REMOVE THIS LINE IF IT EXISTS

    // Update UI to reflect current selections
    updateSelectionCount();
    updateBulkActionsVisibility();

    // ... rest of function ...
}
```

### 5.2 Update Version Number

**File**: `/public/index-modern.html`
**Location**: Line with `<script src="modern-app.js?v=..."`

**Change:**
```html
<!-- Before -->
<script src="modern-app.js?v=1763155100"></script>

<!-- After -->
<script src="modern-app.js?v=1763156000"></script>
```

### 5.3 Testing Checklist

#### Unit Testing

**Test Selection Mode:**
```javascript
// In browser console:

// 1. Toggle selection mode
window.toggleSelectionMode();
// Expected: Checkboxes appear on all cards

// 2. Select an item
window.toggleItemSelection('H600', true);
console.log(catalogueState.selectedItems);
// Expected: Set(1) {'H600'}

// 3. Try to exceed limit
for (let i = 0; i < 30; i++) {
    window.toggleItemSelection(`TEST${i}`, true);
}
console.log(catalogueState.selectedItems.size);
// Expected: 25 (max limit)

// 4. Clear selection
window.clearSelection();
console.log(catalogueState.selectedItems.size);
// Expected: 0
```

**Test Selection Persistence:**
```javascript
// 1. Select items
window.toggleItemSelection('H600', true);
window.toggleItemSelection('H601', true);

// 2. Navigate to next page
catalogueState.currentPage = 2;
renderCatalogue();

// 3. Check selections still exist
console.log(catalogueState.selectedItems);
// Expected: Set(2) {'H600', 'H601'}

// 4. Go back to page 1
catalogueState.currentPage = 1;
renderCatalogue();

// Expected: Cards H600 and H601 still have checkmarks
```

#### Integration Testing

**Test Small Bulk Generation (2-3 items):**
1. Enter selection mode
2. Select 2-3 programmes/modules
3. Click "Generate Selected (ZIP)"
4. Verify progress modal appears
5. Verify progress updates for each item
6. Verify ZIP file downloads
7. Extract ZIP and verify all documents present

**Test Error Handling:**
1. Select items including one with invalid code
2. Start bulk generation
3. Verify failed item is logged in summary
4. Verify other items complete successfully
5. Verify ZIP contains only successful documents

**Test Cancellation:**
1. Select 10+ items
2. Start bulk generation
3. Click "Cancel" after 2-3 items
4. Verify generation stops
5. Verify partial documents not downloaded

**Test Maximum Selection:**
1. Click "Select All Filtered" with >25 filtered items
2. Verify only 25 selected
3. Verify notification shown
4. Try to manually select 26th item
5. Verify blocked with notification

#### Browser Testing

Test in all major browsers:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

**Browser-specific issues to watch for:**
- ZIP generation memory limits (Safari < 100MB)
- Download behavior (some browsers block multiple downloads)
- Progress modal rendering
- Checkbox styling

---

## Troubleshooting

### Common Issues

#### Issue 1: "JSZip is not defined"

**Symptoms:**
```
Uncaught ReferenceError: JSZip is not defined
```

**Solutions:**
1. Check JSZip loaded: `console.log(typeof JSZip)`
2. Verify CDN script tag in HTML
3. Check browser console for failed script load
4. Try alternative CDN:
   ```html
   <script src="https://unpkg.com/jszip@3.10.1/dist/jszip.min.js"></script>
   ```

#### Issue 2: Checkboxes Not Appearing

**Symptoms:**
- Selection mode active but no checkboxes visible

**Debugging:**
```javascript
console.log(catalogueState.selectionMode); // Should be true
console.log(document.querySelector('.catalogue-card input[type="checkbox"]')); // Should not be null
```

**Solutions:**
1. Check `renderProgrammeCard()` and `renderModuleCard()` have checkbox code
2. Verify `renderCatalogue()` is called after toggling mode
3. Check for JavaScript errors in console
4. Clear browser cache and hard refresh (Cmd+Shift+R)

#### Issue 3: Progress Modal Not Showing

**Symptoms:**
- Bulk generation starts but no progress shown

**Debugging:**
```javascript
document.getElementById('bulk-progress-modal').classList.contains('hidden'); // Should be false when active
```

**Solutions:**
1. Check modal HTML exists in index-modern.html
2. Verify `showBulkProgressModal()` is called
3. Check z-index conflicts (modal has `z-[100]`)
4. Inspect element to see if modal is rendered but hidden

#### Issue 4: ZIP File Empty or Corrupted

**Symptoms:**
- ZIP downloads but has 0 bytes or won't open

**Debugging:**
```javascript
// Check if blobs are being created
// Add to generateBulkDocuments after blob generation:
console.log(`Blob size: ${blob.size} bytes`);
```

**Solutions:**
1. Verify templates load correctly (check Network tab)
2. Check docxtemplater has valid data
3. Ensure `zip.file()` is called with valid blob
4. Test single document generation first
5. Check browser console for CORS errors

#### Issue 5: Selections Lost After Filter

**Symptoms:**
- Selected items disappear when applying filters

**Possible Cause:**
- `catalogueState.selectedItems.clear()` being called in filter functions

**Solution:**
```javascript
// In applyProgrammeCatalogueFilters() and applyModuleCatalogueFilters()
// REMOVE any lines like:
catalogueState.selectedItems.clear(); // ❌ DELETE THIS

// Keep selections intact - they persist across filters as per requirements
```

#### Issue 6: Memory Issues with Large Selections

**Symptoms:**
- Browser becomes unresponsive
- "Out of memory" errors

**Solutions:**
1. Reduce max selection limit (currently 25)
2. Increase delay between generations:
   ```javascript
   await new Promise(resolve => setTimeout(resolve, 200)); // Increase from 100ms
   ```
3. Clear blob references after adding to ZIP:
   ```javascript
   zip.file(filename, blob);
   blob = null; // Clear reference
   ```

---

## Performance Optimization

### Template Caching

Currently, each document generation loads the template file. For bulk operations, cache the template:

```javascript
// Add to catalogueState
templateCache: {}

// In generateProgrammeDocBlob():
async function generateProgrammeDocBlob(data, cohort, year) {
    const docPath = cohort === 'cohort'
        ? `/speccohort${year}.docx`
        : `/specterm${year}.docx`;

    // Check cache first
    if (catalogueState.templateCache[docPath]) {
        return generateFromCachedTemplate(
            catalogueState.templateCache[docPath],
            data,
            cohort,
            year
        );
    }

    // Load and cache template
    return new Promise((resolve, reject) => {
        loadFile(docPath, function(error, content) {
            if (error) {
                reject(error);
                return;
            }

            // Cache the content
            catalogueState.templateCache[docPath] = content;

            // Generate document
            // ... rest of code
        });
    });
}
```

### Batch API Endpoint (Optional)

Create backend endpoint to fetch multiple items at once:

**File**: `/routes/api.js`

```javascript
// Add new route
router.post('/batch-prog-data',
  rateLimiters.api,
  async (req, res) => {
    const { codes, cohort, year } = req.body;

    if (!Array.isArray(codes) || codes.length > 25) {
      return res.status(400).json({
        error: 'Invalid codes array or exceeds limit (25)'
      });
    }

    const results = {};

    for (const code of codes) {
      try {
        // Use existing programmeData logic
        const data = await getProgrammeData(code, cohort, year);
        results[code] = data;
      } catch (error) {
        results[code] = { error: error.message };
      }
    }

    res.json(results);
  }
);
```

Then update frontend to use batch endpoint instead of individual requests.

---

## Future Enhancements

### Phase 6: Polish (Optional)

1. **Better Summary Modal**
   - Replace `alert()` with styled modal
   - Show list of successful/failed items
   - Allow downloading failed items list as CSV
   - "Retry Failed" button

2. **Estimated Time Remaining**
   ```javascript
   // Track average time per document
   let avgTimePerDoc = 0;
   const startTime = Date.now();

   // After each successful generation:
   const elapsed = (Date.now() - startTime) / 1000;
   avgTimePerDoc = elapsed / successItems.length;
   const remaining = Math.ceil((total - current) * avgTimePerDoc);

   // Display: "Estimated time remaining: 2 minutes"
   ```

3. **Keyboard Shortcuts**
   ```javascript
   // Shift+Click to select range
   // Ctrl+A to select all
   // Esc to exit selection mode
   ```

4. **Selection Preview**
   - Show list of selected items in a panel
   - Allow removing individual items from list
   - Export selection to CSV

5. **Save/Load Selections**
   ```javascript
   // Save to localStorage
   localStorage.setItem('catalogue-selection',
     JSON.stringify(Array.from(catalogueState.selectedItems))
   );

   // Load on page load
   const saved = localStorage.getItem('catalogue-selection');
   if (saved) {
     catalogueState.selectedItems = new Set(JSON.parse(saved));
   }
   ```

---

## Deployment Checklist

Before deploying to production:

- [ ] All Phase 1-5 steps completed
- [ ] JSZip library added (npm or CDN)
- [ ] All functions tested individually
- [ ] Integration tests passed
- [ ] Tested in Chrome, Firefox, Safari
- [ ] Tested on mobile devices
- [ ] Error handling tested (network failures, invalid data)
- [ ] Cancellation tested
- [ ] Maximum selection limit tested
- [ ] Selection persistence verified
- [ ] ZIP file extraction verified
- [ ] Version number updated in HTML
- [ ] Browser cache cleared for testing
- [ ] Documentation updated
- [ ] Git commit created with descriptive message

### Deployment Commands

```bash
# Navigate to project directory
cd /Volumes/CORP/AS/PS_Share/Curriculum\ Management\ Team/Downloadable-Specs/prog-mod-specs

# Install JSZip if using npm
npm install jszip@^3.10.1

# Restart server
# (Use your existing restart method)

# Verify deployment
# Open browser and test selection mode
```

---

## Support & Maintenance

### Monitoring

Add analytics tracking to monitor usage:

```javascript
// Track bulk generation events
window.generateBulkDocuments = async function() {
    // ... existing code ...

    // Log analytics event
    if (window.gtag) {
        gtag('event', 'bulk_generation_start', {
            'item_count': selectedCodes.length,
            'item_type': type
        });
    }

    // ... rest of function ...

    // After completion
    if (window.gtag) {
        gtag('event', 'bulk_generation_complete', {
            'success_count': successItems.length,
            'failed_count': failedItems.length,
            'item_type': type
        });
    }
};
```

### User Feedback

Collect user feedback on the feature:
- Average selection size
- Success/failure rates
- Common error messages
- User complaints/requests

### Regular Maintenance

- Monitor JSZip library for updates
- Check docxtemplater compatibility
- Review error logs for common failures
- Optimize performance based on usage patterns

---

## Summary

This implementation adds powerful bulk generation capabilities to the catalogue feature while maintaining:

- **Simplicity**: Minimal UI changes, intuitive workflow
- **Performance**: Sequential processing, proper memory management
- **Reliability**: Error handling, cancellation support
- **User Experience**: Progress tracking, clear feedback
- **Maintainability**: Clean code, well-documented

**Total Implementation Time**: 5-8 days

**Key Benefits**:
- Save users hours of repetitive clicking
- Generate multiple specifications in one action
- Professional ZIP packaging
- Robust error handling
- Accessible and intuitive interface

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01-14 | Initial implementation guide created |

---

## Contact & Support

For questions or issues with this implementation:
1. Check Troubleshooting section above
2. Review browser console for errors
3. Test individual functions in isolation
4. Verify all dependencies loaded correctly
5. Check Git history for recent changes

---

**End of Implementation Guide**
