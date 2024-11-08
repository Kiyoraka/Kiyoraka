@echo off
setlocal EnableDelayedExpansion

echo Checking prerequisites...

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if token.txt exists
if not exist "token.txt" (
    echo Error: token.txt not found
    echo Please create token.txt with your GitHub token
    pause
    exit /b 1
)

REM Check if package.json exists
if not exist "package.json" (
    echo Error: package.json not found
    echo Please ensure you're in the correct directory
    pause
    exit /b 1
)

REM Check if node_modules exists, if not install dependencies
if not exist "node_modules\" (
    echo Installing dependencies...
    npm install
    if %ERRORLEVEL% NEQ 0 (
        echo Error: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Read token safely
set /p TOKEN=<token.txt
if "!TOKEN!"=="" (
    echo Error: token.txt is empty
    pause
    exit /b 1
)

echo Setting up environment...
set GITHUB_TOKEN=!TOKEN!

echo Running stats update...
node stats.js
if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to update stats
    pause
    exit /b 1
)

echo Stats update completed successfully!
echo.
echo Press any key to exit...
pause >nul