# Starts Hospital 1 (SwasthyaEHR): Django API on :8000 + React on :3000.
# Run from the project root in its own terminal:
#   powershell -ExecutionPolicy Bypass -File start-hospital-1.ps1
$root = $PSScriptRoot
$backend = Join-Path $root "hospital-1\backend"
$frontend = Join-Path $root "hospital-1\frontend"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backend'; .\venv\Scripts\Activate.ps1; python manage.py runserver 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontend'; npm run dev"

Write-Host "Hospital 1 starting: API http://localhost:8000  |  Web http://localhost:3000" -ForegroundColor Green
