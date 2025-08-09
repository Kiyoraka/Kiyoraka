@echo off
echo.
echo 🎮 =====================================
echo    COMMITTING POOL SYSTEM
echo =====================================
echo.

echo 📋 Adding pool system files...
git add pool.js
git add .github/workflows/update-readme.yml
git add .gitignore
git add POOL_SETUP.md
git add setup-pool.bat
git add check-setup.bat
git add commit-pool-system.bat

REM Add pool.json if it exists
if exist pool.json (
    echo 📊 Adding pool.json with your baseline data...
    git add pool.json
) else (
    echo ⚠️  pool.json not found - make sure to run setup-pool.bat first
)

echo 📝 Committing changes...
git commit -m "🎮 Initialize Pool System - Level Only Increases!"

if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ Commit failed! This might mean:
    echo 1. No changes to commit (files already committed)
    echo 2. Git configuration issue
    echo.
    pause
    exit /b 1
)

echo 🚀 Pushing to GitHub...
git push

if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ Push failed! Please check:
    echo 1. You have push permissions to this repository
    echo 2. You're connected to the internet
    echo 3. Your branch is set up correctly
    echo.
    echo You can manually push with: git push
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ =====================================
echo    POOL SYSTEM DEPLOYED!
echo =====================================
echo.
echo 🎯 Your pool system is now live!
echo 🤖 GitHub Actions will run daily at 7 AM (UTC+8)
echo 📈 Your level will only increase from now on!
echo.
echo 📊 Check your updated README.md to see the new stats
echo.
pause 