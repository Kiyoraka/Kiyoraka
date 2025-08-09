@echo off
echo.
echo 🔍 =====================================
echo    POOL SYSTEM SETUP CHECKER
echo =====================================
echo.

echo Checking prerequisites...
echo.

REM Check if Node.js is installed
echo 📦 Checking Node.js...
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo    Please install Node.js from https://nodejs.org/
    set /a errors+=1
) else (
    for /f "tokens=*" %%a in ('node --version') do echo ✅ Node.js found: %%a
)

REM Check if npm is available
echo 📦 Checking npm...
npm --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ npm is not available
    set /a errors+=1
) else (
    for /f "tokens=*" %%a in ('npm --version') do echo ✅ npm found: %%a
)

REM Check if token.txt exists
echo 🔑 Checking GitHub token...
if exist token.txt (
    echo ✅ token.txt file found
    set /p token=<token.txt
    if "!token!"=="" (
        echo ❌ token.txt file is empty
        set /a errors+=1
    ) else (
        echo ✅ GitHub token is present
    )
) else (
    echo ❌ token.txt file not found
    echo    Please create token.txt with your GitHub Personal Access Token
    set /a errors+=1
)

REM Check if package.json exists
echo 📋 Checking package.json...
if exist package.json (
    echo ✅ package.json found
) else (
    echo ❌ package.json not found
    set /a errors+=1
)

REM Check if pool.js exists
echo 🎮 Checking pool system files...
if exist pool.js (
    echo ✅ pool.js found
) else (
    echo ❌ pool.js not found
    set /a errors+=1
)

REM initialize-pool.js is now integrated into pool.js

if exist setup-pool.bat (
    echo ✅ setup-pool.bat found
) else (
    echo ❌ setup-pool.bat not found
    set /a errors+=1
)

echo.
if %errors% equ 0 (
    echo ✅ =====================================
    echo    ALL CHECKS PASSED! 🎉
    echo =====================================
    echo.
    echo 🚀 You're ready to run: setup-pool.bat
    echo.
) else (
    echo ❌ =====================================
    echo    %errors% ISSUE(S) FOUND
    echo =====================================
    echo.
    echo Please fix the issues above before running setup-pool.bat
    echo.
)

pause 