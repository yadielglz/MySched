# Employee Schedule Viewer (PWA)

A Progressive Web App for viewing employee schedules from Google Sheets.

## Features

- 📱 **Progressive Web App** - Installable on any device
- 🔄 **Real-time Updates** - Fetches latest schedule from Google Sheets
- 🔍 **Search Functionality** - Quickly find employees
- 📅 **Week Navigation** - Navigate through different weeks
- 🎨 **Modern UI** - Clean, responsive design
- ⚡ **Offline Support** - Works offline with cached data
- 📊 **Visual Status Indicators** - Color-coded schedule statuses

## Setup Instructions

### 1. Make Google Sheet Public

1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1RcMXkA2uaQK-ixK9K5EpOnszRAvzM_d3ZXVDsHsvOMw/edit
2. Click **File** → **Share** → **Get link**
3. Set access to **"Anyone with the link"** can view
4. Copy the link

### 2. Update Sheet ID (if needed)

The app is already configured with your sheet ID. If you need to change it, edit `app.js`:

```javascript
const SHEET_ID = '1RcMXkA2uaQK-ixK9K5EpOnszRAvzM_d3ZXVDsHsvOMw';
```

### 3. Create PWA Icons

You'll need to create icon files in the `icons/` directory. You can use an online tool like:
- https://www.pwabuilder.com/imageGenerator
- https://realfavicongenerator.net/

Required icon sizes:
- 72x72
- 96x96
- 128x128
- 144x144
- 152x152
- 192x192
- 384x384
- 512x512

Or use this command to generate placeholder icons (requires ImageMagick):

```bash
mkdir -p icons
for size in 72 96 128 144 152 192 384 512; do
  convert -size ${size}x${size} xc:#2563eb -pointsize $((size/4)) -fill white -gravity center -annotate +0+0 "📅" icons/icon-${size}x${size}.png
done
```

### 4. Serve the Application

#### Option A: Using a Local Server (Recommended for Development)

**Python 3:**
```bash
python3 -m http.server 8000
```

**Node.js (http-server):**
```bash
npx http-server -p 8000
```

**PHP:**
```bash
php -S localhost:8000
```

Then open: http://localhost:8000

#### Option B: Deploy to Web Hosting

Deploy all files to any static hosting service:
- **Netlify** - Drag and drop the folder
- **Vercel** - Connect your GitHub repo
- **GitHub Pages** - Push to a GitHub repo and enable Pages
- **Firebase Hosting** - Use Firebase CLI

### 5. Install as PWA

1. Open the app in a supported browser (Chrome, Edge, Safari)
2. Look for the install prompt or use the browser menu:
   - **Chrome/Edge**: Click the install icon in the address bar
   - **Safari (iOS)**: Tap Share → Add to Home Screen
3. The app will be installed and accessible like a native app

## Google Sheets Format

The app expects the following format:

- **Row 1**: Day headers (THU, FRI, SAT, etc.)
- **Row 2**: Dates (11/27, 11/28, etc.)
- **Row 3+**: Employee data
  - Column A: Employee name
  - Columns B-H: Start times (or HOLIDAY, OFF, MGR)
  - Next row: End times for the same employee

Example:
```
| Employee        | THU      | FRI      | SAT    |
|-----------------|----------|----------|--------|
| 11/27           | 11/28    | 11/29    |        |
| Stephen Cruz    | HOLIDAY  | 10:00 AM | OFF    |
|                 | 9:30 PM  | OFF      | 6:00 PM|
```

## Customization

### Change Colors

Edit `styles.css` and modify the CSS variables:

```css
:root {
  --primary-color: #2563eb;
  --primary-dark: #1e40af;
  /* ... */
}
```

### Adjust Sheet Range

In `app.js`, modify:

```javascript
const SHEET_RANGE = 'A1:H100'; // Change to match your sheet size
```

## Browser Support

- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Safari (iOS 11.3+)
- ✅ Firefox
- ✅ Samsung Internet

## Troubleshooting

### Schedule not loading?

1. Ensure the Google Sheet is publicly accessible
2. Check browser console for errors
3. Verify the sheet ID is correct
4. Make sure the sheet range covers all your data

### Service Worker not working?

1. Ensure you're serving over HTTPS (or localhost)
2. Clear browser cache and reload
3. Check browser console for service worker errors

### Icons not showing?

1. Create the `icons/` directory
2. Add all required icon sizes
3. Ensure paths in `manifest.json` are correct

## License

MIT License - Feel free to use and modify as needed.

