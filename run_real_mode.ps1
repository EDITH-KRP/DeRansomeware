Write-Host "Starting De-Ransom in REAL MODE (not demo)" -ForegroundColor Green
Write-Host ""
Write-Host "This will start the application with real ransomware detection and blockchain integration."
Write-Host ""
Write-Host "Make sure you have configured the .env file with your blockchain and IPFS credentials."
Write-Host ""
Write-Host "Press any key to start the application..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host ""
Write-Host "Running in real mode..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/k python run.py" -WorkingDirectory $PSScriptRoot

Write-Host ""
Write-Host "The application should now be running in a new window." -ForegroundColor Green
Write-Host "You can access the web interface at http://localhost:5000" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to exit this window..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")