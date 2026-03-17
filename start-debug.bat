@echo off
chcp 65001 >nul
setlocal enableextensions

echo ============================================================
echo Diagnostic Startup Script
echo ============================================================
echo.

pushd "%~dp0"
echo [1] Current directory: %CD%
echo.

echo [2] Checking Node.js...
where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js NOT FOUND!
  echo Please install Node.js from: https://nodejs.org/
  echo.
  pause
  exit /b 1
) else (
  echo [OK] Node.js found
  node --version
  echo.
)

echo [3] Checking npm...
where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm NOT FOUND!
  echo.
  pause
  exit /b 1
) else (
  echo [OK] npm found
  npm --version
  echo.
)

echo [4] Checking node_modules...
if not exist node_modules (
  echo [INFO] node_modules NOT FOUND - will install dependencies
  echo Running: npm install
  echo This may take a few minutes...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERROR] npm install FAILED!
    echo.
    pause
    exit /b 1
  )
  echo [OK] Dependencies installed
  echo.
) else (
  echo [OK] node_modules exists
  echo.
)

echo [5] Checking .env file...
if not exist ".env" (
  echo [WARN] .env file NOT FOUND (optional)
  echo.
) else (
  echo [OK] .env file exists
  echo.
)

echo [6] Checking package.json...
if not exist "package.json" (
  echo [ERROR] package.json NOT FOUND!
  echo Are you in the correct directory?
  echo.
  pause
  exit /b 1
) else (
  echo [OK] package.json exists
  echo.
)

echo ============================================================
echo All checks passed! Starting server...
echo Press Ctrl+C to stop the server
echo ============================================================
echo.

call npm run dev

echo.
echo ============================================================
echo Server stopped
echo ============================================================
pause
