@echo off
echo.
echo 🎮 =====================================
echo    POOL SYSTEM SETUP
echo =====================================
echo.

REM Check if token.txt file exists
if not exist token.txt (
    echo ❌ token.txt file not found!
    echo.
    echo Please create a token.txt file with your GitHub Personal Access Token
    echo.
    echo Steps:
    echo 1. Go to GitHub.com → Settings → Developer settings → Personal access tokens
    echo 2. Generate new token with 'repo' permissions
    echo 3. Copy the token and save it in token.txt file
    echo 4. Run this script again
    echo.
    pause
    exit /b 1
)

echo 🔑 Reading GitHub token from token.txt...
set /p PERSONAL_GITHUB_TOKEN=<token.txt

echo 📦 Installing dependencies...
call npm install

echo 🚀 Initializing pool with all your current data...
call node pool.js

if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ Setup failed! Please check:
    echo 1. Your GitHub token is valid
    echo 2. You have internet connection
    echo 3. GitHub API is accessible
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ =====================================
echo    SETUP COMPLETE!
echo =====================================
echo.
echo 📁 Files created:
echo   - pool.json (your baseline data)
echo   - Updated workflow file
echo.
echo 📋 Next steps:
echo   1. Review pool.json to see your stats
echo   2. Commit and push all files
echo   3. Your daily workflow will now use the pool system
echo.
echo 🎯 Your level will now only INCREASE! 📈
echo.
pause 