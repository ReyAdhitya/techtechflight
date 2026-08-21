@echo off
REM TechTech Flight — classroom launcher (Windows).
REM Double-click this file. No terminal typing, no npm commands for the boss.
setlocal
cd /d "%~dp0"

REM Node, carried beside the app so a technician never sees a version number.
REM
REM The first line of this file used to be a check that Node existed, with instructions to go
REM and install it. That is the wrong thing to hand somebody who has been handed a trolley: it
REM is a dead end in the one minute before a class, on a machine they may not be allowed to
REM install software on. Put a Node folder next to this file and it is used; fall back to a
REM system Node for developers, and only then say something a person can act on.
set "NODE_EXE="
if exist "%~dp0node\node.exe" set "NODE_EXE=%~dp0node\node.exe"
if exist "%~dp0runtime\node\node.exe" set "NODE_EXE=%~dp0runtime\node\node.exe"

if defined NODE_EXE (
  set "PATH=%~dp0node;%~dp0runtime\node;%PATH%"
) else (
  where node >nul 2>&1
  if errorlevel 1 (
    echo.
    echo TechTech Flight cannot start: the Node folder is missing from this copy.
    echo.
    echo This usually means the folder was copied incompletely. Copy the whole
    echo TechTech Flight folder again, then run this file.
    echo.
    pause
    exit /b 1
  )
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
if defined NODE_EXE (
  "%NODE_EXE%" "scripts\classroom-address.mjs" 4321
) else (
  node "scripts\classroom-address.mjs" 4321
)

echo.
echo Ground station window stays open while you teach.
echo Close that window when the lesson is finished.
echo.
echo Your class records are kept on this laptop.
echo Settings has a button to save a copy to your Desktop.
echo.
echo AI detection: http://127.0.0.1:8090 when the AI Service window is running.
echo.
pause
