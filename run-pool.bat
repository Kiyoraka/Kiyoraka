@echo off
echo.
echo 🎮 =====================================
echo    RUNNING POOL STATS SYSTEM
echo =====================================
echo.

REM Check if token.txt exists
if not exist token.txt (
    echo ❌ token.txt not found!
    echo Please create token.txt with your GitHub Personal Access Token
    pause
    exit /b 1
)

REM Set GitHub Token from file
set /p PERSONAL_GITHUB_TOKEN=<token.txt

echo 🔑 Using GitHub token from token.txt...
echo 🚀 Running pool stats calculation...
echo.

REM Run the pool system
node pool.js

if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ Pool stats failed! Check:
    echo 1. GitHub token is valid
    echo 2. Internet connection
    echo 3. API rate limits
    echo.
) else (
    echo.
    echo ✅ Pool stats completed successfully!
    echo 📊 Check your updated README.md
    echo.
)

pause 