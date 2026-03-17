@echo off
setlocal enableextensions

REM ============================================================
REM  一键启动脚本（Windows）
REM  1. 检查 Node.js / npm
REM  2. 自动安装依赖（若缺失）
REM  3. 启动开发服务器（npm run dev）
REM ============================================================

pushd "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] 未检测到 Node.js，请先安装 https://nodejs.org/ LTS 版本。
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] 未检测到 npm（Node.js 自带），请检查安装。
  pause
  exit /b 1
)

if not exist node_modules (
  echo [INFO] 未检测到 node_modules，正在安装依赖...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install 失败，请检查网络或权限。
    pause
    exit /b 1
  )
)

if not exist ".env" (
  echo [WARN] 未找到 .env 文件，如需自定义 JWT_SECRET 等参数请基于 .env.example 创建。
)

if "%JWT_SECRET%"=="" (
  echo [INFO] 未检测到系统级 JWT_SECRET，将使用 .env（若存在）中的配置。
)

echo [INFO] 启动开发服务器（按 Ctrl+C 停止）...
call npm run dev

set "EXIT_CODE=%ERRORLEVEL%"
popd

if "%EXIT_CODE%" NEQ "0" (
  echo [ERROR] 启动失败，退出码 %EXIT_CODE%。
) else (
  echo [INFO] 服务器已停止。
)

pause
exit /b %EXIT_CODE%

