@echo off
title Gaurav Personal Notes Desktop App
cd /d "%~dp0.."
echo Starting Gaurav Personal Notes Desktop Application...

if exist "%LOCALAPPDATA%\Gaurav Personal Notes\Gaurav Personal Notes.exe" (
    start "" "%LOCALAPPDATA%\Gaurav Personal Notes\Gaurav Personal Notes.exe"
    exit /b 0
)

if exist "src-tauri\target\release\gpn.exe" (
    start "" "src-tauri\target\release\gpn.exe"
    exit /b 0
)

if exist "src-tauri\target\debug\gpn.exe" (
    start "" "src-tauri\target\debug\gpn.exe"
    exit /b 0
)

echo [Error] No installed or compiled Gaurav Personal Notes binary found.
pause
