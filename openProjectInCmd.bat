@echo off
REM Open a CMD in the folder where this batch file resides

REM Change directory to the folder of this batch file
cd /d "%~dp0"

REM Optional: display current directory
echo You are now in: %CD%

REM Open a new CMD window in this directory
cmd
