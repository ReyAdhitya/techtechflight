@echo off
REM TechTech Flight — classroom launcher (Windows).
REM Double-click this file. No terminal typing, no npm commands for the boss.
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is not installed. Install it from https://nodejs.org then try again.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo First run: installing packages. This can take a few minutes...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

if not exist "web\out\index.html" (
  echo Building the board once so the ground station can serve it...
  call npm run build --workspace=web
  if errorlevel 1 (
    echo Board build failed.
    pause
    exit /b 1
  )
)

echo Starting the ground station on http://localhost:4321 ...
start "TechTech Ground Station" cmd /k "cd /d ""%~dp0"" && npm run start --workspace=ground-station"

timeout /t 3 /nobreak >nul
start "" "http://localhost:4321/"

echo.
echo Ground station window stays open while you teach.
echo Close that window when the lesson is finished.
echo.
echo Default Fleet is the classroom Simulator.
echo Settings can switch next launch to Radio ^(MAVLink^) — monitoring only.
echo Close this ground-station window and run the launcher again after changing path.
echo.
pause
