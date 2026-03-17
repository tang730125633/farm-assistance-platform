@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Starting server at http://localhost:3000
echo Press Ctrl+C to stop
echo.
npm run dev
pause
