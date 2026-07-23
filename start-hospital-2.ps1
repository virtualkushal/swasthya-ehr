# Starts Hospital 2 (AarogyaEHR): Django API on :8001 + React on :3001.
# Run from the project root in its own terminal:
#   powershell -ExecutionPolicy Bypass -File start-hospital-2.ps1
$root = $PSScriptRoot
$backend = Join-Path $root "hospital-2\backend"
$frontend = Join-Path $root "hospital-2\frontend"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backend'; .\venv\Scripts\Activate.ps1; python manage.py runserver 8001"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontend'; npm run dev"

Write-Host "Hospital 2 starting: API http://localhost:8001  |  Web http://localhost:3001" -ForegroundColor Green
