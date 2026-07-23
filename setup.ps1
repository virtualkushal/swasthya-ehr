# One-time setup for BOTH hospitals: creates venvs, installs deps, creates DBs,
# migrates, and seeds demo data. Run once from the project root:
#   powershell -ExecutionPolicy Bypass -File setup.ps1
#
# Prereqs: Python 3.11+, Node 18+, and PostgreSQL running locally with the
# postgres user password matching the DB_PASSWORD in each backend/.env file.
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

function Setup-Hospital($dir, $dbName) {
  Write-Host "`n=== Setting up $dir (DB: $dbName) ===" -ForegroundColor Cyan
  $backend = Join-Path $root "$dir\backend"
  $frontend = Join-Path $root "$dir\frontend"

  # Create the database if it does not exist (ignore error if it already does).
  Write-Host "Creating database $dbName (ignore error if it exists)..."
  & psql -U postgres -c "CREATE DATABASE $dbName;" 2>&1 | Out-Host

  # Backend venv + deps
  Push-Location $backend
  if (-not (Test-Path "venv")) {
    Write-Host "Creating Python venv..."
    python -m venv venv
  }
  Write-Host "Installing backend dependencies..."
  & .\venv\Scripts\python.exe -m pip install --upgrade pip --quiet
  & .\venv\Scripts\python.exe -m pip install -r requirements.txt --quiet
  Write-Host "Running migrations..."
  & .\venv\Scripts\python.exe manage.py migrate
  Write-Host "Seeding demo data..."
  & .\venv\Scripts\python.exe manage.py seed_demo
  Pop-Location

  # Frontend deps
  Push-Location $frontend
  Write-Host "Installing frontend dependencies (npm install)..."
  & npm install --silent
  Pop-Location
}

Setup-Hospital "hospital-1" "swasthya1"
Setup-Hospital "hospital-2" "aarogya2"

Write-Host "`nSetup complete. Now run start-hospital-1.ps1 and start-hospital-2.ps1 in separate terminals." -ForegroundColor Green
