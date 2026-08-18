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

REM Optional YOLO11x AI service — CUDA if an NVIDIA GPU is present, else CPU.
REM Board falls back to in-browser YOLOv8n when this is missing or fails.
if exist "ai-service\.venv\Scripts\uvicorn.exe" (
  echo Starting AI detection service on http://127.0.0.1:8090 ...
  start "TechTech AI Service" cmd /k "cd /d ""%~dp0ai-service"" && .venv\Scripts\activate && uvicorn app.main:app --host 127.0.0.1 --port 8090"
) else if exist "ai-service\requirements.txt" (
  echo AI service venv not found. To enable YOLO11x: see ai-service\README.md
)

echo Starting the ground station on http://localhost:4321 ...
start "TechTech Ground Station" cmd /k "cd /d ""%~dp0"" && npm run start --workspace=ground-station"

timeout /t 3 /nobreak >nul

REM The board opens on localhost and never on the LAN address. getUserMedia is refused on a
REM plain http:// address that is not localhost, so opening the board at 10.0.0.2 breaks the
REM camera in a way that reads to a Teacher as a permissions problem.
start "" "http://localhost:4321/"

REM The address for the iPads, printed once and drawn as a QR. Nobody types an IP in front
REM of a class.
node "scripts\classroom-address.mjs" 4321

echo.
echo Ground station window stays open while you teach.
echo Close that window when the lesson is finished.
echo.
echo AI detection: http://127.0.0.1:8090 when the AI Service window is running.
echo.
pause
