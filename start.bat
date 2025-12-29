@echo off
REM EZ Health - Quick Start for Windows

echo.
echo ======================================================
echo  Health Tracking Telegram Mini App
echo ======================================================
echo.

REM Check and install frontend dependencies
if not exist "frontend\node_modules" (
    echo [*] Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

REM Check and install backend dependencies  
if not exist "backend\node_modules" (
    echo [*] Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)

echo.
echo ======================================================
echo  Starting Application...
echo ======================================================
echo.

echo Frontend will be available at: http://localhost:3000
echo Backend API will be available at: http://localhost:3001
echo.
echo [*] Opening 2 terminals...
echo.

REM Start backend in new window
echo [Backend] Starting server...
start cmd /k "cd backend && npm start"

REM Wait a bit for backend to start
timeout /t 3

REM Start frontend in new window
echo [Frontend] Starting application...
start cmd /k "cd frontend && npm start"

echo.
echo [✓] Application started!
echo.
echo Press Ctrl+C in each terminal window to stop the application.
pause
