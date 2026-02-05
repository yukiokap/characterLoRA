@echo off
setlocal
cd /d "%~dp0"

echo [AiManager] Starting services...
echo.

:: Check if node_modules exists, if not install dependencies
if not exist "node_modules" (
    echo [AiManager] Initial setup: Installing root dependencies...
    call npm install
)
if not exist "client\node_modules" (
    echo [AiManager] Initial setup: Installing client dependencies...
    call npm install --prefix client
)
if not exist "server\node_modules" (
    echo [AiManager] Initial setup: Installing server dependencies...
    call npm install --prefix server
)

:: Start the application in a new minimized window
echo [AiManager] Launching Server and Client...
start /min cmd /c "npm run dev"

:: Wait for a few seconds for Vite to start
echo [AiManager] Waiting for the app to ready...
timeout /t 5 /nobreak > nul

:: Open the browser
echo [AiManager] Opening browser at http://localhost:5173
start http://localhost:5173

echo.
echo [AiManager] App is running!
echo You can close this window, but keep the minimized one running.
echo.
pause
