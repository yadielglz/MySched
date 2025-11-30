# Quick Start Guide

## 1. Generate Icons (Required for PWA)

Open `generate-icons.html` in your browser and download all the icons to the `icons/` folder.

Or use this one-liner if you have ImageMagick installed:

```bash
mkdir -p icons && for size in 72 96 128 144 152 192 384 512; do convert -size ${size}x${size} xc:#2563eb -pointsize $((size/4)) -fill white -gravity center -annotate +0+0 "📅" icons/icon-${size}x${size}.png; done
```

## 2. Make Google Sheet Public

1. Go to: https://docs.google.com/spreadsheets/d/1RcMXkA2uaQK-ixK9K5EpOnszRAvzM_d3ZXVDsHsvOMw/edit
2. Click **Share** → **Change to anyone with the link** → **Viewer**
3. Copy the link

## 3. Start Local Server

```bash
# Option 1: Using npm (if you have Node.js)
npm start

# Option 2: Using Python
python3 -m http.server 8000

# Option 3: Using PHP
php -S localhost:8000
```

## 4. Open in Browser

Navigate to: http://localhost:8000

## 5. Test PWA Installation

- **Chrome/Edge**: Look for install icon in address bar
- **Safari (iOS)**: Share → Add to Home Screen
- **Android Chrome**: Menu → Add to Home Screen

## Troubleshooting

**Schedule not loading?**
- Ensure Google Sheet is public
- Check browser console (F12) for errors
- Verify sheet ID in `app.js`

**Icons missing?**
- Generate icons using `generate-icons.html`
- Ensure all icon files are in `icons/` folder

**Service Worker not working?**
- Must be served over HTTPS (or localhost)
- Clear browser cache
- Check browser console for errors

