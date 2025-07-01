@echo off
echo.
echo 🔄 =====================================
echo    RESETTING POOL SYSTEM
echo =====================================
echo.

echo ⚠️  This will delete your current pool and recreate it with cached data
echo    This should give you HIGHER language stats!
echo.
set /p confirm="Continue? (y/n): "
if /i not "%confirm%"=="y" (
    echo Operation cancelled.
    pause
    exit /b 0
)

echo.
echo 🗑️  Deleting current pool.json...
if exist pool.json (
    del pool.json
    echo ✅ pool.json deleted
) else (
    echo ℹ️  pool.json doesn't exist
)

echo.
echo 🔑 Reading GitHub token from token.txt...
if not exist token.txt (
    echo ❌ token.txt file not found!
    echo Please create token.txt with your GitHub token first.
    pause
    exit /b 1
)
set /p PERSONAL_GITHUB_TOKEN=<token.txt

echo.
echo 🚀 Reinitializing pool with cached data for higher stats...
call node pool.js

if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ Reset failed! Please check:
    echo 1. Your GitHub token is valid
    echo 2. You have internet connection
    echo 3. GitHub API is accessible
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ =====================================
echo    POOL RESET COMPLETE!
echo =====================================
echo.
echo 📈 Your pool now has higher language stats from cached data!
echo 🎯 Check your README.md to see the improved stats
echo.
echo Next steps:
echo 1. Review the new pool.json file
echo 2. Commit and push: git add pool.json README.md && git commit -m "🔄 Reset pool with higher stats" && git push
echo.
pause 