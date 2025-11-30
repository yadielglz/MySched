# Testing Guide

## Server Status
✅ Server should be running on: http://localhost:8000

## What to Test

### 1. Basic Functionality
- [ ] Page loads without errors
- [ ] Schedule data loads from Google Sheet
- [ ] Employee names are displayed correctly
- [ ] Time slots show start and end times
- [ ] Dates appear in table headers

### 2. Status Badges
- [ ] "HOLIDAY" shows as yellow Holiday badge
- [ ] "OFF" shows as gray Off badge  
- [ ] "MGR" shows as blue Manager badge

### 3. Search Functionality
- [ ] Type employee name in search box
- [ ] Results filter correctly
- [ ] Clear search shows all employees

### 4. Responsive Design
- [ ] Test on mobile viewport (resize browser)
- [ ] Table scrolls horizontally on small screens
- [ ] Header controls stack on mobile

### 5. PWA Features
- [ ] Service worker registers (check console)
- [ ] App works offline (after first load)
- [ ] Install prompt appears (if supported)
- [ ] Icons display correctly (if generated)

### 6. Error Handling
- [ ] Error message shows if sheet is inaccessible
- [ ] Retry button works
- [ ] Loading spinner appears during fetch

## Browser Console Checks

Open Developer Tools (F12) and check:
- No red errors in Console
- Service Worker registered successfully
- Network tab shows successful fetch to Google Sheets
- Application tab shows cached resources

## Common Issues

**Schedule not loading?**
- Check if Google Sheet is public
- Verify sheet ID in app.js matches your sheet
- Check browser console for CORS errors

**Icons missing?**
- Generate icons using generate-icons.html
- Icons are optional - app works without them

**Service Worker not working?**
- Must be served over HTTP/HTTPS (localhost works)
- Clear browser cache and reload
- Check console for service worker errors

