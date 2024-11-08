@echo off
REM Set GitHub Token from a file
set /p TOKEN=<token.txt

REM Display the token (Optional for debugging purposes)
echo Using GitHub Token: %TOKEN%

REM Set the TOKEN as an environment variable for this session
set TOKEN=%TOKEN%

REM Run the Node.js script
node stats.js

REM Pause the terminal to see the output
pause
