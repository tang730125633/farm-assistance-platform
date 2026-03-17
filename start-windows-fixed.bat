@echo off
chcp 65001 >nul
setlocal enableextensions

REM ============================================================
REM  One-Click Startup Script (Windows)
REM  1. Check Node.js / npm
REM  2. Auto install dependencies (if missing)
REM  3. Start development server (npm run dev)
REM ============================================================

pushd "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found. Please install from https://nodejs.org/ (LTS version)
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm not found. Please check your Node.js installation.
  pause
  exit /b 1
)

if not exist node_modules (
  echo [INFO] node_modules not found. Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed. Please check your network or permissions.
    pause
    exit /b 1
  )
)

if not exist ".env" (
  echo [WARN] .env file not found. For custom JWT_SECRET, create one based on .env.example
)

if "%JWT_SECRET%"=="" (
  echo [INFO] No system-level JWT_SECRET found. Will use .env file (if exists).
)

echo [INFO] Starting development server (Press Ctrl+C to stop)...
call npm run dev

set "EXIT_CODE=%ERRORLEVEL%"
popd

if "%EXIT_CODE%" NEQ "0" (
  echo [ERROR] Startup failed with exit code %EXIT_CODE%.
) else (
  echo [INFO] Server stopped.
)

pause
exit /b %EXIT_CODE%
