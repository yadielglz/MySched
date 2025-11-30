// Google Sheets Configuration
const SHEET_ID = '1RcMXkA2uaQK-ixK9K5EpOnszRAvzM_d3ZXVDsHsvOMw';
const SHEET_RANGE = 'A1:H200'; // Increased range to capture more employees

// State
let scheduleData = {
    past: [],
    current: [],
    next: []
};
let allEmployees = new Map(); // Map to combine employees across weeks
let currentWeekOffset = 0;
let currentWeekView = 'current'; // 'past', 'current', or 'next'

// DOM Elements
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const scheduleContainer = document.getElementById('scheduleContainer');
const scheduleTable = document.getElementById('scheduleTable');
const scheduleHeader = document.getElementById('scheduleHeader');
const scheduleBody = document.getElementById('scheduleBody');
const searchInput = document.getElementById('searchInput');
const refreshBtn = document.getElementById('refreshBtn');
const retryBtn = document.getElementById('retryBtn');
const prevWeekBtn = document.getElementById('prevWeek');
const nextWeekBtn = document.getElementById('nextWeek');
const weekRangeEl = document.getElementById('weekRange');

// DOM Elements for clock
const clockTimeEl = document.getElementById('clockTime');
const clockDayEl = document.getElementById('clockDay');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSchedule();
    setupEventListeners();
    registerServiceWorker();
    setupPWAInstall();
    initializeClock();
    updateClock(); // Initial update
});

// Event Listeners
function setupEventListeners() {
    searchInput.addEventListener('input', handleSearch);
    refreshBtn.addEventListener('click', loadSchedule);
    retryBtn.addEventListener('click', loadSchedule);
    prevWeekBtn.addEventListener('click', () => navigateWeek('prev'));
    nextWeekBtn.addEventListener('click', () => navigateWeek('next'));
}

// Sheet names - these match the Google Sheets tab names
// If your sheets have different names, update these values
const SHEET_NAMES = {
    past: 'past',           // Try: 'past', 'Past', 'PAST', 'Past Week', 'past week'
    current: 'current',     // Try: 'current', 'Current', 'CURRENT', 'Current Week', 'current week'
    next: 'next week'       // Try: 'next week', 'Next Week', 'NEXT WEEK', 'nextweek', 'next'
};

// Debug: Log the URLs being used (for troubleshooting)
function logSheetUrls() {
    console.log('Sheet URLs being used:');
    Object.entries(SHEET_NAMES).forEach(([key, name]) => {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}&range=${SHEET_RANGE}`;
        console.log(`  ${key}: ${url}`);
    });
}

// Get week info based on offset (for date calculations)
function getWeekInfo(offset = 0) {
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + (offset * 7));
    
    return {
        date: targetDate
    };
}

// Load schedule from a specific sheet
async function loadSheetData(sheetName, weekKey) {
    // Try multiple variations of the sheet name (case variations, with/without spaces)
    const sheetNameVariations = [
        sheetName,
        sheetName.toLowerCase(),
        sheetName.toUpperCase(),
        sheetName.charAt(0).toUpperCase() + sheetName.slice(1).toLowerCase(),
        sheetName.trim()
    ];
    
    // Remove duplicates
    const uniqueVariations = [...new Set(sheetNameVariations)];
    
    console.log(`Attempting to load ${weekKey} week from sheet: "${sheetName}"`);
    console.log(`Trying variations:`, uniqueVariations);
    
    for (const name of uniqueVariations) {
        // Add cache-busting parameter to ensure we get fresh data
        const cacheBuster = new Date().getTime();
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}&range=${SHEET_RANGE}&t=${cacheBuster}`;
        
        try {
            const response = await fetch(url, {
                cache: 'no-store' // Force fresh fetch
            });
            
            if (!response.ok) {
                console.warn(`  ✗ Sheet "${name}" returned status ${response.status}`);
                continue;
            }
            
            const csvText = await response.text();
            
            // Check if we got actual data or an error message
            if (csvText.includes('error') || csvText.trim().length === 0) {
                console.warn(`  ✗ Sheet "${name}" returned empty or error response`);
                continue;
            }
            
            const data = parseCSV(csvText);
            
            // Check if we have meaningful data (more than just headers)
            if (data.length > 2) {
                // Get a sample of the date row to verify it's different
                // Date row is typically the row right after the header row containing "Employee"
                let dateRowIndex = -1;
                for (let i = 0; i < data.length; i++) {
                    if (data[i] && data[i][0] && data[i][0].toLowerCase().includes('employee')) {
                        dateRowIndex = i + 1;
                        break;
                    }
                }
                const dateRow = dateRowIndex >= 0 && dateRowIndex < data.length ? data[dateRowIndex] : null;
                const sampleDates = dateRow ? dateRow.slice(1, 4).filter(d => d && d.trim()).join(', ') : 'no dates';
                
                console.log(`  ✓ Loaded ${weekKey} week from sheet: "${name}" (${data.length} rows)`);
                console.log(`    Sample dates: ${sampleDates}`);
                return data;
            } else {
                console.warn(`  ✗ Sheet "${name}" has only ${data.length} rows (likely empty)`);
            }
        } catch (error) {
            console.warn(`  ✗ Error loading sheet "${name}":`, error.message);
            continue;
        }
    }
    
    // If all variations failed, log and return empty
    console.error(`✗ Could not load ${weekKey} week from any variation of "${sheetName}"`);
    console.error(`  Make sure the sheet tab is named exactly: "${sheetName}" (case may vary)`);
    return [];
}

// Load schedule from Google Sheets (all three weeks)
async function loadSchedule() {
    showLoading();
    hideError();
    
    // Log URLs for debugging (only in development)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        logSheetUrls();
    }
    
    try {
        // Load from the three named sheets: past, current, and next week
        const loadPromises = [
            loadSheetData(SHEET_NAMES.past, 'past'),
            loadSheetData(SHEET_NAMES.current, 'current'),
            loadSheetData(SHEET_NAMES.next, 'next')
        ];
        
        const [pastData, currentData, nextData] = await Promise.all(loadPromises);
        
        // Log loading results with data verification
        console.log('\n=== Loading Results ===');
        
        // Helper function to get date row from data
        const getDateRow = (data) => {
            if (!data || data.length === 0) return null;
            for (let i = 0; i < data.length; i++) {
                if (data[i] && data[i][0] && data[i][0].toLowerCase().includes('employee')) {
                    if (i + 1 < data.length) {
                        return data[i + 1]; // Date row is right after header row
                    }
                }
            }
            return null;
        };
        
        console.log(`  Past Week: ${pastData.length} rows`);
        const pastDateRow = getDateRow(pastData);
        if (pastDateRow) {
            const pastDates = pastDateRow.slice(1, 4).filter(d => d && d.trim());
            console.log(`    Dates: ${pastDates.length > 0 ? pastDates.join(', ') : 'none found'}`);
        } else {
            console.log(`    Dates: no date row found`);
        }
        
        console.log(`  Current Week: ${currentData.length} rows`);
        const currentDateRow = getDateRow(currentData);
        if (currentDateRow) {
            const currentDates = currentDateRow.slice(1, 4).filter(d => d && d.trim());
            console.log(`    Dates: ${currentDates.length > 0 ? currentDates.join(', ') : 'none found'}`);
        } else {
            console.log(`    Dates: no date row found`);
        }
        
        console.log(`  Next Week: ${nextData.length} rows`);
        const nextDateRow = getDateRow(nextData);
        if (nextDateRow) {
            const nextDates = nextDateRow.slice(1, 4).filter(d => d && d.trim());
            console.log(`    Dates: ${nextDates.length > 0 ? nextDates.join(', ') : 'none found'}`);
        } else {
            console.log(`    Dates: no date row found`);
        }
        console.log('======================\n');
        
        // Check if past and current have the same date row (indicating wrong sheet loaded)
        if (pastDateRow && currentDateRow) {
            const pastDatesStr = JSON.stringify(pastDateRow);
            const currentDatesStr = JSON.stringify(currentDateRow);
            if (pastDatesStr === currentDatesStr) {
                console.error('⚠️ WARNING: Past week and Current week appear to have identical date rows!');
                console.error('   This suggests both are loading from the same sheet.');
                console.error('   Please verify the sheet names in Google Sheets match:');
                console.error(`   - Past: "${SHEET_NAMES.past}"`);
                console.error(`   - Current: "${SHEET_NAMES.current}"`);
                console.error(`   - Next: "${SHEET_NAMES.next}"`);
            } else {
                console.log('✓ Past and Current weeks have different dates - sheets are loading correctly');
            }
        }
        
        scheduleData = {
            past: pastData,
            current: currentData,
            next: nextData
        };
        
        // Check if we have at least some data
        const hasData = pastData.length > 0 || currentData.length > 0 || nextData.length > 0;
        
        if (!hasData) {
            throw new Error('No schedule data found in any sheet. Please check that the sheets are named "past", "current", and "next week".');
        }
        
        // Warn if past week is empty but others have data
        if (pastData.length === 0 && (currentData.length > 0 || nextData.length > 0)) {
            console.warn('⚠️ Past week sheet appears to be empty. Check the sheet name in Google Sheets - it should be exactly "past" (case may vary).');
        }
        
        // Reset to current week view on load
        currentWeekView = 'current';
        renderSchedule();
        hideLoading();
        showSchedule();
    } catch (error) {
        console.error('Error loading schedule:', error);
        hideLoading();
        showError();
    }
}

// Parse CSV data
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    const data = [];
    
    // Process all rows (we'll filter empty ones later)
    for (let i = 0; i < lines.length; i++) {
        const cells = parseCSVLine(lines[i]);
        if (cells.length > 0) {
            // Only add rows that have at least one non-empty cell
            if (cells.some(cell => cell.trim())) {
                data.push(cells);
            }
        }
    }
    
    return data;
}

// Parse a single CSV line handling quoted values
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            // Strip surrounding quotes if present
            let value = current.trim();
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            }
            result.push(value);
            current = '';
        } else {
            current += char;
        }
    }
    
    // Handle last value
    let value = current.trim();
    if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
    }
    result.push(value);
    return result;
}

// Navigate between weeks
function navigateWeek(direction) {
    const weekOrder = ['past', 'current', 'next'];
    const currentIndex = weekOrder.indexOf(currentWeekView);
    
    if (direction === 'prev' && currentIndex > 0) {
        currentWeekView = weekOrder[currentIndex - 1];
    } else if (direction === 'next' && currentIndex < weekOrder.length - 1) {
        currentWeekView = weekOrder[currentIndex + 1];
    }
    
    // Update button states
    updateNavigationButtons();
    
    // Re-render with the selected week
    renderSchedule();
}

// Update navigation button states
function updateNavigationButtons() {
    const weekOrder = ['past', 'current', 'next'];
    const currentIndex = weekOrder.indexOf(currentWeekView);
    
    prevWeekBtn.disabled = currentIndex === 0;
    nextWeekBtn.disabled = currentIndex === weekOrder.length - 1;
    
    // Add visual feedback
    if (prevWeekBtn.disabled) {
        prevWeekBtn.style.opacity = '0.5';
        prevWeekBtn.style.cursor = 'not-allowed';
    } else {
        prevWeekBtn.style.opacity = '1';
        prevWeekBtn.style.cursor = 'pointer';
    }
    
    if (nextWeekBtn.disabled) {
        nextWeekBtn.style.opacity = '0.5';
        nextWeekBtn.style.cursor = 'not-allowed';
    } else {
        nextWeekBtn.style.opacity = '1';
        nextWeekBtn.style.cursor = 'pointer';
    }
}

// Render schedule table (single week view)
function renderSchedule() {
    // Reset employees map
    allEmployees.clear();
    
    // Get the data for the currently selected week
    const weekDataMap = {
        'past': { label: 'Past Week', data: scheduleData.past },
        'current': { label: 'Current Week', data: scheduleData.current },
        'next': { label: 'Next Week', data: scheduleData.next }
    };
    
    const selectedWeek = weekDataMap[currentWeekView];
    
    scheduleBody.innerHTML = '';
    scheduleHeader.innerHTML = '';
    
    // Check if we have data for the selected week
    if (!selectedWeek.data || selectedWeek.data.length === 0) {
        scheduleBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">No schedule data found for this week</td></tr>';
        scheduleHeader.innerHTML = '<tr><th>Employee</th><th>THU</th><th>FRI</th><th>SAT</th><th>SUN</th><th>MON</th><th>TUE</th><th>WED</th></tr>';
        updateWeekRange();
        return;
    }
    
    // Log raw data structure for debugging
    console.log(`\n=== Parsing ${currentWeekView} week ===`);
    console.log(`Total rows: ${selectedWeek.data.length}`);
    console.log(`First 5 rows:`, selectedWeek.data.slice(0, 5));
    
    // Find header and date rows
    let headerRowIndex = -1;
    let dateRowIndex = -1;
    
    for (let i = 0; i < selectedWeek.data.length; i++) {
        const row = selectedWeek.data[i];
        if (row && row[0] && row[0].toLowerCase().includes('employee')) {
            headerRowIndex = i;
            dateRowIndex = i + 1;
            break;
        }
    }
    
    if (headerRowIndex === -1) {
        // Fallback: assume first two rows are header and date
        headerRowIndex = 0;
        dateRowIndex = 1;
    }
    
    const headerRow = selectedWeek.data[headerRowIndex] || [];
    const dateRow = selectedWeek.data[dateRowIndex] || [];
    const dayHeaders = headerRow.length > 0 ? headerRow : ['Employee', 'THU', 'FRI', 'SAT', 'SUN', 'MON', 'TUE', 'WED'];
    const dates = dateRow.slice(1, 8);
    
    console.log(`Header row (${headerRowIndex}):`, headerRow);
    console.log(`Date row (${dateRowIndex}):`, dateRow);
    
    // Render header
    scheduleHeader.innerHTML = `
        <tr>
            ${dayHeaders.map((day, idx) => `
                <th>
                    ${day || ''}
                    ${idx > 0 && dates[idx - 1] && dates[idx - 1].trim() ? `<br><span style="font-size: 0.75rem; font-weight: normal; color: var(--text-secondary);">${dates[idx - 1]}</span>` : ''}
                </th>
            `).join('')}
        </tr>
    `;
    
    // NEW PARSING LOGIC: Process employees starting after date row
    const employees = [];
    const startIndex = dateRowIndex + 1;
    
    console.log(`\n=== Processing employee rows starting from index ${startIndex} ===`);
    
    for (let i = startIndex; i < selectedWeek.data.length; i++) {
        const currentRow = selectedWeek.data[i];
        if (!currentRow || !currentRow[0]) continue;
        
        const firstCell = String(currentRow[0]).trim();
        
        // Skip if this is a header row or empty row
        if (!firstCell || firstCell.toLowerCase().includes('employee')) {
            continue;
        }
        
        // This looks like an employee name row
        const employeeName = firstCell;
        const nextRow = selectedWeek.data[i + 1] || [];
        const nextRowFirstCell = nextRow[0] ? String(nextRow[0]).trim() : '';
        
        // Check if next row is another employee (has a name) or is a time row (empty first cell)
        const hasTimeRow = nextRowFirstCell === '' && nextRow.some((cell, idx) => idx > 0 && cell && String(cell).trim());
        
        // Extract day data (columns 1-7, which are days)
        const dayData = [];
        const maxCols = Math.max(currentRow.length, hasTimeRow ? nextRow.length : 0, 8);
        
        for (let col = 1; col < maxCols && col < 8; col++) {
            const startVal = currentRow[col] ? String(currentRow[col]).trim() : '';
            const endVal = hasTimeRow && nextRow[col] ? String(nextRow[col]).trim() : '';
            
            // Store both values - we'll use the appropriate one when rendering
            dayData.push({
                start: startVal,
                end: endVal
            });
        }
        
        // Ensure we have 7 days
        while (dayData.length < 7) {
            dayData.push({ start: '', end: '' });
        }
        
        employees.push({
            name: employeeName,
            dayData: dayData
        });
        
        // If we used the next row as time row, skip it
        if (hasTimeRow) {
            i++;
        }
        
        // Debug for Patricia
        if (employeeName.toLowerCase().includes('patricia')) {
            console.log(`\nFound ${employeeName}:`);
            console.log(`  Row ${i}:`, currentRow);
            if (hasTimeRow) {
                console.log(`  Row ${i + 1} (time row):`, nextRow);
            }
            console.log(`  Extracted day data:`, dayData.map((d, idx) => `${dayHeaders[idx + 1] || idx}: start="${d.start}", end="${d.end}"`));
        }
    }
    
    console.log(`\nTotal employees found: ${employees.length}`);
    console.log(`Employee names:`, employees.map(e => e.name));
    
    // Render employees
    if (employees.length === 0) {
        scheduleBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">No employees found for this week</td></tr>';
        updateWeekRange();
        return;
    }
    
    employees.forEach(employee => {
        const row = document.createElement('tr');
        let cells = `<td class="employee-name">${employee.name}</td>`;
        
        // Process each day
        employee.dayData.forEach((day, idx) => {
            const start = day.start || '';
            const end = day.end || '';
            
            // Normalize for comparison
            const startUpper = start.toUpperCase().trim();
            const endUpper = end.toUpperCase().trim();
            const combined = `${startUpper} ${endUpper}`.trim();
            
            // Check for status indicators
            // If either start or end contains a status, use it for the entire day
            const hasHoliday = startUpper.includes('HOLIDAY') || endUpper.includes('HOLIDAY');
            // OFF detection: if either cell has OFF, show OFF for the entire day
            const hasOff = startUpper.includes('OFF') || endUpper.includes('OFF') || 
                          startUpper === 'OFF' || endUpper === 'OFF';
            const hasMgr = startUpper.includes('MGR') || endUpper.includes('MGR') ||
                          startUpper.includes('MANAGER') || endUpper.includes('MANAGER') ||
                          startUpper === 'MGR' || endUpper === 'MGR' ||
                          startUpper === 'MANAGER' || endUpper === 'MANAGER';
            
            // Debug for Patricia
            if (employee.name.toLowerCase().includes('patricia')) {
                console.log(`  Day ${idx} (${dayHeaders[idx + 1] || 'unknown'}): start="${start}", end="${end}", hasMgr=${hasMgr}`);
            }
            
            // Render cell based on priority: Holiday > Off > Manager > Times > Empty
            if (hasHoliday) {
                cells += '<td><span class="status-badge status-holiday">Holiday</span></td>';
            } else if (hasOff) {
                cells += '<td><span class="status-badge status-off">Off</span></td>';
            } else if (hasMgr) {
                cells += '<td><span class="status-badge status-mgr">Manager</span></td>';
            } else if (!start && !end) {
                cells += '<td class="empty-cell">-</td>';
            } else {
                cells += `
                    <td>
                        <div class="time-slot">
                            ${start ? `<span class="start-time">${start}</span>` : ''}
                            ${end ? `<span class="end-time">${end}</span>` : ''}
                        </div>
                    </td>
                `;
            }
        });
        
        row.innerHTML = cells;
        scheduleBody.appendChild(row);
    });
    
    console.log(`\n=== Rendering complete ===\n`);
    
    updateWeekRange();
    updateNavigationButtons();
}

// Search functionality
function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    
    // Filter employees based on search
    const employeeRows = scheduleBody.querySelectorAll('tr');
    employeeRows.forEach(row => {
        const nameCell = row.querySelector('.employee-name');
        if (nameCell) {
            const name = nameCell.textContent.toLowerCase();
            if (query === '' || name.includes(query)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });
}

function updateWeekRange() {
    // Show the currently selected week
    const weekLabels = {
        'past': 'Past Week',
        'current': 'Current Week',
        'next': 'Next Week'
    };
    
    weekRangeEl.textContent = weekLabels[currentWeekView];
}

// UI Helpers
function showLoading() {
    loadingEl.style.display = 'block';
    errorEl.style.display = 'none';
    scheduleContainer.style.display = 'none';
}

function hideLoading() {
    loadingEl.style.display = 'none';
}

function showError() {
    errorEl.style.display = 'block';
    scheduleContainer.style.display = 'none';
}

function hideError() {
    errorEl.style.display = 'none';
}

function showSchedule() {
    scheduleContainer.style.display = 'block';
}

// Service Worker Registration
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registered:', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    }
}

// PWA Install Prompt
let deferredPrompt;
function setupPWAInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstallPrompt();
    });
}

function showInstallPrompt() {
    // You can add an install prompt UI here if needed
    // For now, users can install via browser menu
}

// Install PWA
window.addEventListener('appinstalled', () => {
    console.log('PWA installed');
    deferredPrompt = null;
});

// Clock functionality
function initializeClock() {
    // Update clock immediately
    updateClock();
    
    // Update clock every minute
    setInterval(updateClock, 60000);
}

function updateClock() {
    const now = new Date();
    
    // Format time in 12-hour format (HH:MM)
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    // Convert to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    
    // Format with leading zeros
    const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
    
    // Format day
    const dayOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDay = now.toLocaleDateString('en-US', dayOptions);
    
    if (clockTimeEl) {
        clockTimeEl.textContent = formattedTime;
    }
    if (clockDayEl) {
        clockDayEl.textContent = formattedDay;
    }
}

