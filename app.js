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
let currentDayIndex = 0; // 0-6 for the 7 days of the week
let isMobile = false;

// DOM Elements
const homeView = document.getElementById('homeView');
const scheduleView = document.getElementById('scheduleView');
const promotionsView = document.getElementById('promotionsView');
const homeBtn = document.getElementById('homeBtn');
const scheduleBtn = document.getElementById('scheduleBtn');
const promotionsBtn = document.getElementById('promotionsBtn');
const viewScheduleBtn = document.getElementById('viewScheduleBtn');
const refreshPromosBtn = document.getElementById('refreshPromosBtn');
const promoLoading = document.getElementById('promoLoading');
const promoError = document.getElementById('promoError');
const promoContent = document.getElementById('promoContent');
const promoGrid = document.getElementById('promoGrid');
const promoFilters = document.getElementById('promoFilters');
const filterType = document.getElementById('filterType');
const filterPlan = document.getElementById('filterPlan');
const filterSearch = document.getElementById('filterSearch');
const clearFiltersBtn = document.getElementById('clearFilters');
const retryPromoBtn = document.getElementById('retryPromoBtn');
const promoModal = document.getElementById('promoModal');
const promoModalOverlay = document.getElementById('promoModalOverlay');
const promoModalClose = document.getElementById('promoModalClose');
const promoModalBody = document.getElementById('promoModalBody');

const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const scheduleContainer = document.getElementById('scheduleContainer');
const scheduleTable = document.getElementById('scheduleTable');
const scheduleHeader = document.getElementById('scheduleHeader');
const scheduleBody = document.getElementById('scheduleBody');
const refreshBtn = document.getElementById('refreshBtn');
const retryBtn = document.getElementById('retryBtn');
const prevWeekBtn = document.getElementById('prevWeek');
const nextWeekBtn = document.getElementById('nextWeek');
const weekRangeEl = document.getElementById('weekRange');
const daySelectorMobile = document.getElementById('daySelectorMobile');
const mobileNavContainer = document.getElementById('mobileNavContainer');
const prevDayBtn = document.getElementById('prevDay');
const nextDayBtn = document.getElementById('nextDay');
const currentDayEl = document.getElementById('currentDay');
const prevWeekMobileBtn = document.getElementById('prevWeekMobile');
const nextWeekMobileBtn = document.getElementById('nextWeekMobile');
const weekRangeMobileEl = document.getElementById('weekRangeMobile');
const currentWeekInfo = document.getElementById('currentWeekInfo');
const employeeCount = document.getElementById('employeeCount');

// Promotions data
let promotionsData = [];
let filteredPromotions = [];

// DOM Elements for clock
const clockTimeEl = document.getElementById('clockTime');
const clockDayEl = document.getElementById('clockDay');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkMobileView();
    setupEventListeners();
    registerServiceWorker();
    setupPWAInstall();
    initializeClock();
    updateClock(); // Initial update
    
    // Show home view by default
    showView('home');
    
    // Listen for window resize to handle mobile/desktop switching
    window.addEventListener('resize', () => {
        const wasMobile = isMobile;
        checkMobileView();
        if (wasMobile !== isMobile) {
            // If switching to mobile and schedule view is active, set to today's day
            if (isMobile && scheduleView && scheduleView.style.display === 'block') {
                setCurrentDayToToday();
            }
            renderSchedule(); // Re-render if mobile state changed
        }
    });
});

// Get current day index based on today's date
// Schedule week starts Thursday (0=THU, 1=FRI, 2=SAT, 3=SUN, 4=MON, 5=TUE, 6=WED)
function getTodayDayIndex() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    
    // Map JavaScript day to schedule day index
    // Schedule: THU=0, FRI=1, SAT=2, SUN=3, MON=4, TUE=5, WED=6
    // JavaScript: SUN=0, MON=1, TUE=2, WED=3, THU=4, FRI=5, SAT=6
    const dayMap = {
        0: 3, // Sunday -> SUN (index 3)
        1: 4, // Monday -> MON (index 4)
        2: 5, // Tuesday -> TUE (index 5)
        3: 6, // Wednesday -> WED (index 6)
        4: 0, // Thursday -> THU (index 0)
        5: 1, // Friday -> FRI (index 1)
        6: 2  // Saturday -> SAT (index 2)
    };
    
    return dayMap[dayOfWeek] || 0;
}

// Set current day to today (mobile only)
function setCurrentDayToToday() {
    if (isMobile) {
        currentDayIndex = getTodayDayIndex();
        updateDaySelector();
    }
}

// Check if we're on mobile
function checkMobileView() {
    const wasMobile = isMobile;
    isMobile = window.innerWidth <= 768;
    
    // Show/hide mobile navigation container
    if (mobileNavContainer) {
        mobileNavContainer.style.display = isMobile ? 'flex' : 'none';
    }
    // Hide desktop week selector on mobile
    const weekSelector = document.querySelector('.week-selector');
    if (weekSelector) {
        weekSelector.style.display = isMobile ? 'none' : 'flex';
    }
    
    // If switching to mobile, set current day to today
    if (isMobile && !wasMobile) {
        setCurrentDayToToday();
    }
}

// Event Listeners
function setupEventListeners() {
    // Navigation
    homeBtn.addEventListener('click', () => showView('home'));
    scheduleBtn.addEventListener('click', () => showView('schedule'));
    promotionsBtn.addEventListener('click', () => showView('promotions'));
    viewScheduleBtn.addEventListener('click', () => showView('schedule'));
    
    // Schedule controls
    refreshBtn.addEventListener('click', loadSchedule);
    retryBtn.addEventListener('click', loadSchedule);
    prevWeekBtn.addEventListener('click', () => navigateWeek('prev'));
    nextWeekBtn.addEventListener('click', () => navigateWeek('next'));
    if (prevWeekMobileBtn) prevWeekMobileBtn.addEventListener('click', () => navigateWeek('prev'));
    if (nextWeekMobileBtn) nextWeekMobileBtn.addEventListener('click', () => navigateWeek('next'));
    if (prevDayBtn) prevDayBtn.addEventListener('click', () => navigateDay(-1));
    if (nextDayBtn) nextDayBtn.addEventListener('click', () => navigateDay(1));
    
    // Promotions controls
    if (refreshPromosBtn) refreshPromosBtn.addEventListener('click', loadPromotions);
    if (retryPromoBtn) retryPromoBtn.addEventListener('click', loadPromotions);
    if (filterType) filterType.addEventListener('change', applyFilters);
    if (filterSearch) filterSearch.addEventListener('input', applyFilters);
    if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearAllFilters);
    if (promoModalClose) promoModalClose.addEventListener('click', closePromoModal);
    if (promoModalOverlay) promoModalOverlay.addEventListener('click', closePromoModal);
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && promoModal && promoModal.style.display !== 'none') {
            closePromoModal();
        }
    });
}

// View Navigation
function showView(view) {
    // Hide all views
    homeView.style.display = 'none';
    scheduleView.style.display = 'none';
    if (promotionsView) promotionsView.style.display = 'none';
    
    // Remove active class from all nav buttons
    homeBtn.classList.remove('active');
    scheduleBtn.classList.remove('active');
    if (promotionsBtn) promotionsBtn.classList.remove('active');
    
    // Show selected view and activate button
    if (view === 'home') {
        homeView.style.display = 'block';
        homeBtn.classList.add('active');
    } else if (view === 'schedule') {
        scheduleView.style.display = 'block';
        scheduleBtn.classList.add('active');
        // Load schedule if not already loaded
        if (scheduleData.current.length === 0 && scheduleData.past.length === 0 && scheduleData.next.length === 0) {
            loadSchedule();
        }
        // On mobile, set to today's day when viewing schedule
        if (isMobile) {
            setCurrentDayToToday();
            renderSchedule();
        }
    } else if (view === 'promotions') {
        if (promotionsView) {
            promotionsView.style.display = 'block';
            promotionsBtn.classList.add('active');
            loadPromotions();
        }
    }
}

// Update home page info
function updateHomeInfo() {
    const weekLabels = {
        'past': 'Past Week',
        'current': 'Current Week',
        'next': 'Next Week'
    };
    currentWeekInfo.textContent = weekLabels[currentWeekView] || 'Current Week';
    
    // Count unique employees
    const employees = new Set();
    if (scheduleData.current && scheduleData.current.length > 0) {
        // Parse employees from current week
        const currentEmployees = parseEmployeesFromData(scheduleData.current);
        currentEmployees.forEach(emp => employees.add(emp.name));
    }
    employeeCount.textContent = employees.size > 0 ? employees.size : '-';
}

// Helper function to parse employees from data (simplified version)
function parseEmployeesFromData(data) {
    const employees = [];
    let headerRowIndex = -1;
    let dateRowIndex = -1;
    
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (row && row[0] && row[0].toLowerCase().includes('employee')) {
            headerRowIndex = i;
            dateRowIndex = i + 1;
            break;
        }
    }
    
    if (headerRowIndex === -1) {
        headerRowIndex = 0;
        dateRowIndex = 1;
    }
    
    const startIndex = dateRowIndex + 1;
    for (let i = startIndex; i < data.length; i++) {
        const currentRow = data[i];
        if (!currentRow || !currentRow[0]) continue;
        const firstCell = String(currentRow[0]).trim();
        if (!firstCell || firstCell.toLowerCase().includes('employee')) {
            continue;
        }
        employees.push({ name: firstCell });
    }
    
    return employees;
}

// Navigate between days (mobile only)
function navigateDay(direction) {
    currentDayIndex += direction;
    if (currentDayIndex < 0) currentDayIndex = 6;
    if (currentDayIndex > 6) currentDayIndex = 0;
    updateDaySelector();
    renderSchedule();
}

// Update day selector display
function updateDaySelector() {
    if (!isMobile || !currentDayEl) return;
    
    const dayNames = ['THU', 'FRI', 'SAT', 'SUN', 'MON', 'TUE', 'WED'];
    const selectedWeek = {
        'past': scheduleData.past,
        'current': scheduleData.current,
        'next': scheduleData.next
    }[currentWeekView];
    
    // Check if current day is today
    const todayIndex = getTodayDayIndex();
    const isToday = currentWeekView === 'current' && currentDayIndex === todayIndex;
    
    if (selectedWeek && selectedWeek.length > 0) {
        // Get the date for this day
        let dateRowIndex = -1;
        for (let i = 0; i < selectedWeek.length; i++) {
            if (selectedWeek[i] && selectedWeek[i][0] && selectedWeek[i][0].toLowerCase().includes('employee')) {
                dateRowIndex = i + 1;
                break;
            }
        }
        if (dateRowIndex >= 0 && dateRowIndex < selectedWeek.length) {
            const dateRow = selectedWeek[dateRowIndex] || [];
            const dates = dateRow.slice(1, 8);
            const date = dates[currentDayIndex] || '';
            // Show "Today" if it's the current day in current week, otherwise show day name and date
            if (isToday) {
                currentDayEl.textContent = 'Today';
            } else {
                currentDayEl.textContent = `${dayNames[currentDayIndex]}${date ? ' ' + date : ''}`;
            }
        } else {
            currentDayEl.textContent = isToday ? 'Today' : dayNames[currentDayIndex];
        }
    } else {
        currentDayEl.textContent = isToday ? 'Today' : dayNames[currentDayIndex];
    }
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
        // On mobile, set to today; otherwise reset to first day
        if (isMobile) {
            setCurrentDayToToday();
        } else {
            currentDayIndex = 0;
        }
        renderSchedule();
        hideLoading();
        showSchedule();
        updateHomeInfo(); // Update home page info
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
    // On mobile, set to today when viewing current week; otherwise reset to first day
    if (isMobile && currentWeekView === 'current') {
        setCurrentDayToToday();
    } else {
        currentDayIndex = 0;
    }
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
    
    const isPrevDisabled = currentIndex === 0;
    const isNextDisabled = currentIndex === weekOrder.length - 1;
    
    // Desktop buttons
    prevWeekBtn.disabled = isPrevDisabled;
    nextWeekBtn.disabled = isNextDisabled;
    
    // Mobile buttons
    if (prevWeekMobileBtn) {
        prevWeekMobileBtn.disabled = isPrevDisabled;
        prevWeekMobileBtn.style.opacity = isPrevDisabled ? '0.5' : '1';
        prevWeekMobileBtn.style.cursor = isPrevDisabled ? 'not-allowed' : 'pointer';
    }
    if (nextWeekMobileBtn) {
        nextWeekMobileBtn.disabled = isNextDisabled;
        nextWeekMobileBtn.style.opacity = isNextDisabled ? '0.5' : '1';
        nextWeekMobileBtn.style.cursor = isNextDisabled ? 'not-allowed' : 'pointer';
    }
    
    // Add visual feedback for desktop
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
    
    // Render header - on mobile, show only selected day; on desktop, show all days
    const headersToShow = isMobile ? [dayHeaders[0], dayHeaders[currentDayIndex + 1]] : dayHeaders;
    const datesToShow = isMobile ? [dates[currentDayIndex]] : dates;
    
    scheduleHeader.innerHTML = `
        <tr>
            ${headersToShow.map((day, idx) => {
                if (idx === 0) {
                    // Employee column
                    return `<th>${day || 'Employee'}</th>`;
                } else {
                    // Day column
                    const dateIdx = isMobile ? 0 : idx - 1; // On mobile, datesToShow has only one element at index 0
                    const dateValue = datesToShow[dateIdx];
                    return `
                        <th>
                            ${day || ''}
                            ${dateValue && dateValue.trim() ? `<br><span style="font-size: 0.75rem; font-weight: normal; color: var(--text-secondary);">${dateValue}</span>` : ''}
                        </th>
                    `;
                }
            }).join('')}
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
        
        // On mobile, show only the selected day; on desktop, show all days
        if (isMobile) {
            // Mobile: show only the selected day
            const day = employee.dayData[currentDayIndex] || { start: '', end: '' };
            const start = day.start || '';
            const end = day.end || '';
            
            // Normalize for comparison
            const startUpper = start.toUpperCase().trim();
            const endUpper = end.toUpperCase().trim();
            
            // Check for status indicators
            const hasHoliday = startUpper.includes('HOLIDAY') || endUpper.includes('HOLIDAY');
            const hasOff = startUpper.includes('OFF') || endUpper.includes('OFF') || 
                          startUpper === 'OFF' || endUpper === 'OFF';
            const hasMgr = startUpper.includes('MGR') || endUpper.includes('MGR') ||
                          startUpper.includes('MANAGER') || endUpper.includes('MANAGER') ||
                          startUpper === 'MGR' || endUpper === 'MGR' ||
                          startUpper === 'MANAGER' || endUpper === 'MANAGER';
            
            // Render cell based on priority
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
        } else {
            // Desktop: show all days
            employee.dayData.forEach((day, idx) => {
                const start = day.start || '';
                const end = day.end || '';
                
                // Normalize for comparison
                const startUpper = start.toUpperCase().trim();
                const endUpper = end.toUpperCase().trim();
                const combined = `${startUpper} ${endUpper}`.trim();
                
                // Check for status indicators
                const hasHoliday = startUpper.includes('HOLIDAY') || endUpper.includes('HOLIDAY');
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
        }
        
        row.innerHTML = cells;
        scheduleBody.appendChild(row);
    });
    
    console.log(`\n=== Rendering complete ===\n`);
    
    updateWeekRange();
    updateNavigationButtons();
    if (isMobile) {
        updateDaySelector();
    }
}

function updateWeekRange() {
    // Show the currently selected week
    const weekLabels = {
        'past': 'Past Week',
        'current': 'Current Week',
        'next': 'Next Week'
    };
    
    if (weekRangeEl) {
        weekRangeEl.textContent = weekLabels[currentWeekView];
    }
    // Update mobile week label
    if (weekRangeMobileEl) {
        weekRangeMobileEl.textContent = weekLabels[currentWeekView];
    }
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

// Promotions Module
// Google Sheet for promotions (primary source for parsing)
const PROMO_GOOGLE_SHEET_ID = '1aHZ2p4KK3Kho75aT8wjOFMlvhrgFSITj9VG7te2Apyk';
const PROMO_GOOGLE_SHEET_NAME = 'Promo'; // Sheet name
// Proton Drive URL (only for download button, not for parsing)
const PROMO_DOWNLOAD_URL = 'https://drive.proton.me/urls/5ZCKS3Y534#8tcCBS6uIwRB';

async function loadPromotions() {
    if (!promoLoading || !promoError || !promoContent) return;
    
    // Show loading state
    promoLoading.style.display = 'block';
    promoError.style.display = 'none';
    promoContent.style.display = 'none';
    if (promoFilters) promoFilters.style.display = 'none';
    
    try {
        // Load from Google Sheet (primary source)
        if (!PROMO_GOOGLE_SHEET_ID) {
            throw new Error('Google Sheet ID not configured');
        }
        
        const sheetUrl = `https://docs.google.com/spreadsheets/d/${PROMO_GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(PROMO_GOOGLE_SHEET_NAME)}&t=${Date.now()}`;
        
        const response = await fetch(sheetUrl, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-store'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        promotionsData = parseCSVPromotions(csvText);
        
        if (promotionsData.length === 0) {
            console.warn('No promotional offers found in sheet. Make sure the sheet has columns: title/promo_name, requirements, limitations');
            // Show helpful message instead of sample data
            promoContent.innerHTML = `
                <div class="promo-info">
                    <h2>📋 No Promotions Found</h2>
                    <p class="promo-description">
                        The Google Sheet doesn't contain promotional offer data. 
                        Please add promotional offers with the following columns:
                    </p>
                    <ul class="promo-list" style="text-align: left; max-width: 600px; margin: 1rem auto;">
                        <li><strong>title</strong> or <strong>promo_name</strong> - The promotion name (e.g., "iPhone 17 on us")</li>
                        <li><strong>description</strong> - General description of the offer</li>
                        <li><strong>requirements</strong> - What's needed to qualify</li>
                        <li><strong>limitations</strong> - Restrictions/limitations</li>
                        <li><strong>valid_until</strong> - Expiration date (optional)</li>
                        <li><strong>type</strong> - Category (optional)</li>
                        <li><strong>discount</strong> - Discount/offer amount (optional)</li>
                    </ul>
                </div>
            `;
            promoLoading.style.display = 'none';
            promoContent.style.display = 'block';
            return;
        }
        
        populateFilters();
        filteredPromotions = [...promotionsData];
        displayPromotions();
        
        promoLoading.style.display = 'none';
        promoContent.style.display = 'block';
        if (promoFilters) promoFilters.style.display = 'block';
        
    } catch (error) {
        console.error('Error loading promotions from Google Sheet:', error);
        promoLoading.style.display = 'none';
        promoError.style.display = 'block';
    }
}

// Parse JSON promotions data
function parseJSONPromotions(data) {
    const promotions = [];
    
    // Handle different JSON structures
    if (Array.isArray(data)) {
        data.forEach((item, index) => {
            promotions.push({
                id: item.id || index,
                title: item.title || item.name || 'Promotion',
                description: item.description || item.desc || '',
                type: item.type || item.category || 'General',
                plan: item.plan || item.planType || 'All',
                discount: item.discount || item.percent || '',
                validUntil: item.validUntil || item.expires || '',
                image: item.image || item.imageUrl || '',
                link: item.link || item.url || ''
            });
        });
    } else if (data.promotions && Array.isArray(data.promotions)) {
        return parseJSONPromotions(data.promotions);
    } else if (typeof data === 'object') {
        // Single promotion object
        promotions.push({
            id: data.id || 0,
            title: data.title || data.name || 'Promotion',
            description: data.description || data.desc || '',
            type: data.type || data.category || 'General',
            plan: data.plan || data.planType || 'All',
            discount: data.discount || data.percent || '',
            validUntil: data.validUntil || data.expires || '',
            image: data.image || data.imageUrl || '',
            link: data.link || data.url || ''
        });
    }
    
    return promotions;
}

// Parse CSV promotions data - ONLY for promotional offers
function parseCSVPromotions(csvText) {
    const promotions = [];
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) return promotions;
    
    // Parse header row
    const headers = parseCSVLine(lines[0]);
    const headerMap = {};
    headers.forEach((h, i) => {
        headerMap[h.toLowerCase().trim()] = i;
    });
    
    // Check if this looks like a promotions sheet (has promo-specific columns)
    const hasPromoColumns = headerMap['title'] !== undefined || 
                           headerMap['promo_name'] !== undefined || 
                           headerMap['promotion'] !== undefined ||
                           headerMap['requirements'] !== undefined ||
                           headerMap['limitations'] !== undefined;
    
    // Check if this looks like a plan/pricing sheet (has plan columns)
    const hasPlanColumns = headerMap['plan_id'] !== undefined || 
                          headerMap['plan_name'] !== undefined || 
                          headerMap['plan_type'] !== undefined ||
                          headerMap['monthly_total_usd'] !== undefined ||
                          headerMap['price_per_line_usd'] !== undefined;
    
    // If it has plan columns but no promo columns, return empty (don't parse plan data)
    if (hasPlanColumns && !hasPromoColumns) {
        console.warn('Sheet contains plan/pricing data, not promotional offers. Expected columns: title/promo_name, requirements, limitations');
        return promotions;
    }
    
    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
        const cells = parseCSVLine(lines[i]);
        if (cells.length === 0 || !cells[0] || !cells[0].trim()) continue;
        
        const getValue = (key) => {
            const idx = headerMap[key];
            return idx !== undefined ? (cells[idx] || '').trim() : '';
        };
        
        // ONLY look for promotional offer columns
        const promoTitle = getValue('title') || getValue('promo_name') || getValue('promotion') || getValue('name') || '';
        const description = getValue('description') || getValue('desc') || getValue('details') || '';
        const requirements = getValue('requirements') || getValue('requirement') || getValue('qualifications') || '';
        const limitations = getValue('limitations') || getValue('limitation') || getValue('restrictions') || getValue('restriction') || '';
        const validUntil = getValue('valid_until') || getValue('validuntil') || getValue('expires') || getValue('end_date') || getValue('end date') || '';
        const promoType = getValue('type') || getValue('category') || getValue('promo_type') || 'Current Offer';
        const discount = getValue('discount') || getValue('savings') || getValue('offer') || '';
        const image = getValue('image') || getValue('image_url') || getValue('imageurl') || '';
        const link = getValue('link') || getValue('url') || '';
        
        // Parse device lists for different price tiers
        const devices900 = getValue('devices_900') || getValue('$900_devices') || getValue('devices_900_list') || '';
        const devices630 = getValue('devices_630') || getValue('$630_devices') || getValue('devices_630_list') || '';
        const devices315 = getValue('devices_315') || getValue('$315_devices') || getValue('devices_315_list') || '';
        const additionalInfo = getValue('additional_info') || getValue('more_info') || '';
        
        // Skip if no promotional title
        if (!promoTitle || promoTitle.trim() === '') continue;
        
        // If sheet has plan columns, skip rows that look like plan data
        if (hasPlanColumns) {
            // Skip if this row has plan data but no actual promo title in a promo column
            if (getValue('plan_id') || (getValue('plan_name') && !hasPromoColumns)) {
                continue;
            }
        }
        
        promotions.push({
            id: i - 1,
            title: promoTitle,
            description: description || '',
            requirements: requirements || '',
            limitations: limitations || '',
            type: promoType,
            discount: discount,
            validUntil: validUntil,
            image: image,
            link: link,
            devices900: devices900,
            devices630: devices630,
            devices315: devices315,
            additionalInfo: additionalInfo
        });
    }
    
    return promotions;
}

// Create sample promotions for demonstration
function createSamplePromotions() {
    return [
        {
            id: 1,
            title: 'iPhone 17 on Us',
            description: 'Get the latest iPhone 17 absolutely free with eligible plan',
            type: 'Device Promotion',
            discount: 'Free Device',
            requirements: 'New line activation required; Trade-in of eligible device; Minimum $60/month plan',
            limitations: 'One per account; Limited time offer; Subject to credit approval; While supplies last',
            validUntil: '2024-12-31',
            image: '',
            link: ''
        },
        {
            id: 2,
            title: 'Holiday Special - Free Activation',
            description: 'No activation fees this holiday season',
            type: 'Promotion',
            discount: 'Save $35',
            requirements: 'New customer or new line; Must activate before December 31st',
            limitations: 'Cannot be combined with other device promotions; One per account',
            validUntil: '2024-12-31',
            image: '',
            link: ''
        }
    ];
}

// Display image promotion
function displayImagePromotion(imageUrl) {
    if (!promoGrid) return;
    promoGrid.innerHTML = `
        <div class="promo-image-container">
            <img src="${imageUrl}" alt="Promotions" class="promo-image">
        </div>
    `;
}

// Display promotions in grid
function displayPromotions() {
    if (!promoGrid) return;
    
    if (filteredPromotions.length === 0) {
        promoGrid.innerHTML = '<div class="no-promotions">No promotions match your filters.</div>';
        return;
    }
    
    promoGrid.innerHTML = filteredPromotions.map(promo => `
        <div class="promo-card" data-type="${promo.type || ''}" data-promo-id="${promo.id}" onclick="showPromoDetails(${promo.id})">
            ${promo.image ? `<div class="promo-image-wrapper"><img src="${promo.image}" alt="${promo.title}" class="promo-card-image"></div>` : ''}
            <div class="promo-card-content">
                <div class="promo-card-header">
                    <h3 class="promo-card-title">${promo.title}</h3>
                    ${promo.discount ? `<span class="promo-badge">${promo.discount}</span>` : ''}
                </div>
                ${promo.description ? `<p class="promo-card-description">${promo.description}</p>` : ''}
                ${promo.type ? `<div class="promo-card-meta">
                    <span class="promo-type">${promo.type}</span>
                </div>` : ''}
                ${promo.requirements ? `
                    <div class="promo-section">
                        <h4 class="promo-section-title">📋 Requirements</h4>
                        <div class="promo-section-content">${formatPromoText(promo.requirements)}</div>
                    </div>
                ` : ''}
                ${promo.limitations ? `
                    <div class="promo-section">
                        <h4 class="promo-section-title">⚠️ Limitations</h4>
                        <div class="promo-section-content">${formatPromoText(promo.limitations)}</div>
                    </div>
                ` : ''}
                ${promo.validUntil ? `<div class="promo-validity">⏰ Valid until: ${promo.validUntil}</div>` : ''}
                <div class="promo-card-footer">
                    <button class="promo-view-details-btn">View Details →</button>
                    ${promo.link ? `<a href="${promo.link}" target="_blank" class="promo-link" onclick="event.stopPropagation()">Learn More →</a>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// Show promo details in modal
function showPromoDetails(promoId) {
    const promo = promotionsData.find(p => p.id === promoId);
    if (!promo || !promoModal || !promoModalBody) return;
    
    let deviceListsHtml = '';
    if (promo.devices900 || promo.devices630 || promo.devices315) {
        deviceListsHtml = '<div class="promo-device-lists">';
        if (promo.devices900) {
            deviceListsHtml += `
                <div class="device-tier">
                    <h4 class="device-tier-title">$900 Off Devices</h4>
                    <div class="device-tier-content">${formatPromoText(promo.devices900)}</div>
                </div>
            `;
        }
        if (promo.devices630) {
            deviceListsHtml += `
                <div class="device-tier">
                    <h4 class="device-tier-title">$630 Off Devices</h4>
                    <div class="device-tier-content">${formatPromoText(promo.devices630)}</div>
                </div>
            `;
        }
        if (promo.devices315) {
            deviceListsHtml += `
                <div class="device-tier">
                    <h4 class="device-tier-title">$315 Off Devices</h4>
                    <div class="device-tier-content">${formatPromoText(promo.devices315)}</div>
                </div>
            `;
        }
        deviceListsHtml += '</div>';
    }
    
    promoModalBody.innerHTML = `
        <div class="promo-modal-header">
            <h2 class="promo-modal-title">${promo.title}</h2>
            ${promo.discount ? `<span class="promo-badge">${promo.discount}</span>` : ''}
        </div>
        ${promo.description ? `<p class="promo-modal-description">${promo.description}</p>` : ''}
        ${promo.type ? `<div class="promo-modal-meta"><span class="promo-type">${promo.type}</span></div>` : ''}
        ${deviceListsHtml}
        ${promo.requirements ? `
            <div class="promo-modal-section">
                <h3 class="promo-modal-section-title">📋 Requirements</h3>
                <div class="promo-modal-section-content">${formatPromoText(promo.requirements)}</div>
            </div>
        ` : ''}
        ${promo.limitations ? `
            <div class="promo-modal-section">
                <h3 class="promo-modal-section-title">⚠️ Limitations</h3>
                <div class="promo-modal-section-content">${formatPromoText(promo.limitations)}</div>
            </div>
        ` : ''}
        ${promo.additionalInfo ? `
            <div class="promo-modal-section">
                <h3 class="promo-modal-section-title">ℹ️ Additional Information</h3>
                <div class="promo-modal-section-content">${formatPromoText(promo.additionalInfo)}</div>
            </div>
        ` : ''}
        ${promo.validUntil ? `<div class="promo-modal-validity">⏰ Valid until: ${promo.validUntil}</div>` : ''}
        ${promo.link ? `<a href="${promo.link}" target="_blank" class="promo-modal-link">Learn More →</a>` : ''}
    `;
    
    promoModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Close promo modal
function closePromoModal() {
    if (promoModal) {
        promoModal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Make showPromoDetails available globally for onclick
window.showPromoDetails = showPromoDetails;

// Format promo text (handle line breaks, bullets, etc.)
function formatPromoText(text) {
    if (!text) return '';
    
    // Split by common separators and format as list
    const lines = text.split(/[;|•\n]/).filter(line => line.trim());
    
    if (lines.length > 1) {
        return '<ul class="promo-list">' + lines.map(line => 
            `<li>${line.trim()}</li>`
        ).join('') + '</ul>';
    }
    
    return `<p>${text}</p>`;
}

// Populate filter dropdowns
function populateFilters() {
    if (!filterType) return;
    
    // Get unique promo types (Upgrade, New Activation, Port In Required, etc.)
    const types = [...new Set(promotionsData.map(p => p.type).filter(Boolean))].sort();
    
    // Populate type filter
    filterType.innerHTML = '<option value="">All Types</option>' + 
        types.map(type => `<option value="${type}">${type}</option>`).join('');
    
    console.log(`Loaded ${promotionsData.length} promotional offers with ${types.length} types`);
}

// Apply filters
function applyFilters() {
    if (!filterType || !filterSearch) return;
    
    const typeFilter = filterType.value.toLowerCase();
    const searchFilter = filterSearch.value.toLowerCase().trim();
    
    filteredPromotions = promotionsData.filter(promo => {
        const matchesType = !typeFilter || (promo.type && promo.type.toLowerCase() === typeFilter);
        const matchesSearch = !searchFilter || 
            promo.title.toLowerCase().includes(searchFilter) ||
            (promo.description && promo.description.toLowerCase().includes(searchFilter)) ||
            (promo.type && promo.type.toLowerCase().includes(searchFilter)) ||
            (promo.requirements && promo.requirements.toLowerCase().includes(searchFilter)) ||
            (promo.limitations && promo.limitations.toLowerCase().includes(searchFilter)) ||
            (promo.discount && promo.discount.toLowerCase().includes(searchFilter));
        
        return matchesType && matchesSearch;
    });
    
    displayPromotions();
}

// Clear all filters
function clearAllFilters() {
    if (filterType) filterType.value = '';
    if (filterSearch) filterSearch.value = '';
    filteredPromotions = [...promotionsData];
    displayPromotions();
}

// Show CORS warning message
function showCorsWarning() {
    if (!promoContent) return;
    
    const warningHtml = `
        <div class="cors-warning">
            <div class="warning-icon">⚠️</div>
            <h3>Cannot Load Promotions Directly</h3>
            <p>The promotions file is hosted on Proton Drive, which blocks direct access from web browsers due to CORS restrictions.</p>
            <div class="warning-solutions">
                <h4>Solutions:</h4>
                <ul>
                    <li><strong>Use Google Sheets:</strong> Convert your promotions to a Google Sheet and configure the sheet ID in the code</li>
                    <li><strong>Download the file:</strong> Use the download button above to get the file directly</li>
                    <li><strong>Host elsewhere:</strong> Upload the file to a service that allows CORS (like GitHub, or your own server)</li>
                </ul>
                <p class="note-text">For now, sample promotions are displayed below for demonstration.</p>
            </div>
        </div>
    `;
    
    // Insert warning before promo grid
    if (promoGrid && promoGrid.parentElement) {
        const warningDiv = document.createElement('div');
        warningDiv.innerHTML = warningHtml;
        promoGrid.parentElement.insertBefore(warningDiv.firstElementChild, promoGrid);
    }
}

