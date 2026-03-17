@echo off
chcp 65001 >nul
setlocal enableextensions

echo ============================================================
echo DATABASE RESET - ONE CLICK SCRIPT
echo ============================================================
echo.
echo This script will:
echo   1. Backup current data
echo   2. Reset all data to empty
echo   3. Start development server
echo.
echo Press Ctrl+C to cancel, or
pause

pushd "%~dp0"

echo.
echo [STEP 1] Resetting database...
echo ============================================================
node scripts/reset-database.js

if errorlevel 1 (
  echo.
  echo [ERROR] Database reset failed!
  pause
  exit /b 1
)

echo.
echo.
echo [STEP 2] Starting development server...
echo ============================================================
echo Server will start at: http://localhost:3000
echo.
echo What to do next:
echo   - Open browser: http://localhost:3000
echo   - Click "Register" button (top right)
echo   - Create farmer account to add products
echo   - Create consumer account to place orders
echo.
echo Press Ctrl+C to stop the server
echo ============================================================
echo.

call npm run dev

popd
pause
