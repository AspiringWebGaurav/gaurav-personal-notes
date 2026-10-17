@echo off
title Clean Stale System-Wide GPN Installation
color 0f
echo ==============================================================================
echo        GAURAV PERSONAL NOTES - STALE SYSTEM INSTALLATION CLEANUP
echo ==============================================================================
echo.

:: Check for Administrator elevation
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [Info] Requesting Administrator elevation to remove stale Program Files ^& HKLM entries...
    powershell -NoProfile -Command "Start-Process cmd.exe -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

echo [1/3] Removing stale machine-level uninstall registry entry (HKLM)...
reg delete "HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\Gaurav Personal Notes" /f >nul 2>&1
reg delete "HKLM\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\Gaurav Personal Notes" /f >nul 2>&1

echo [2/3] Removing stale Program Files binaries...
if exist "C:\Program Files\Gaurav Personal Notes" (
    rmdir /s /q "C:\Program Files\Gaurav Personal Notes" >nul 2>&1
)

echo [3/3] Removing stale common Start Menu shortcuts...
if exist "C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Gaurav Personal Notes.lnk" (
    del /f /q "C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Gaurav Personal Notes.lnk" >nul 2>&1
)

echo.
echo ==============================================================================
echo [SUCCESS] Stale machine installation successfully cleaned up!
echo.
echo The active, authoritative installation in:
echo   %LOCALAPPDATA%\Gaurav Personal Notes (v0.0.3+)
echo is now the sole single source of truth across Windows Installed Apps,
echo Start Menu, and registry run keys.
echo ==============================================================================
echo.
pause
