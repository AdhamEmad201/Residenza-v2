@echo off
chcp 65001 >nul
title RESIDENZA - Start Development Servers

echo ==================================================
echo   RESIDENZA - Starting Backend & Frontend Servers
echo ==================================================
echo.

REM 1. Start Laravel Backend on http://localhost:8000
echo [1/3] Starting Laravel Backend (http://localhost:8000)...
start "RESIDENZA Backend (:8000)" /D "%~dp0backend" cmd /k "php artisan serve --host=localhost --port=8000"

REM 2. Start Next.js Frontend on http://localhost:3000
echo [2/3] Starting Next.js Frontend (http://localhost:3000)...
start "RESIDENZA Frontend (:3000)" /D "%~dp0frontend" cmd /k "npm run dev"

REM 3. Wait briefly and open the website in the default browser
echo [3/3] Waiting for servers to initialize...
timeout /t 5 /nobreak >nul
echo Opening http://localhost:3000 ...
start "" "http://localhost:3000"

echo.
echo Both servers are running in separate windows.
echo Close those windows whenever you want to stop the servers.
pause
