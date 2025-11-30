# Stop any existing Node processes
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Change to project directory
Set-Location '\\glz-l3-m3\MacSSD\MySched'

# Start the server
Write-Host "Starting server on http://localhost:3000/"
Write-Host "Press Ctrl+C to stop"
Write-Host ""
node server.js

