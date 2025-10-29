@echo off
REM AI Trading Agent - Complete Startup Script (Windows)
REM Starts both the trading agent and dashboard

setlocal enabledelayedexpansion

echo.
echo ========================================
echo  AI Trading Agent + Dashboard
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo Node.js version: %NODE_VERSION%
echo.

REM Check if .env file exists
if not exist .env (
    echo [WARNING] .env file not found
    echo Creating .env from .env.example...
    copy .env.example .env
    echo Please edit .env with your private keys
    echo.
)

REM Build the agent if dist doesn't exist
if not exist dist (
    echo [INFO] Building trading agent...
    call npm run build
    if %errorlevel% neq 0 (
        echo [ERROR] Build failed
        pause
        exit /b 1
    )
    echo.
)

REM Install dashboard dependencies if needed
if not exist dashboard\node_modules (
    echo [INFO] Installing dashboard dependencies...
    cd dashboard
    call npm install
    cd ..
    echo.
)

REM Start trading agent
echo [INFO] Starting Trading Agent on port 3000...
start "Trading Agent" cmd /k npm start
timeout /t 3 /nobreak

REM Check if agent is running
netstat -ano | findstr :3000 >nul
if %errorlevel% neq 0 (
    echo [WARNING] Agent may not be ready yet
)

echo [OK] Trading Agent started
echo.

REM Start dashboard
echo [INFO] Starting Dashboard on port 5173...
cd dashboard
start "Dashboard" cmd /k npm run dev
cd ..
timeout /t 3 /nobreak

echo.
echo ========================================
echo  AI Trading Agent is running!
echo ========================================
echo.
echo Dashboard:       http://localhost:5173
echo Agent API:       http://localhost:3000
echo.
echo Press Ctrl+C in each window to stop
echo.
pause
