@echo off
setlocal enabledelayedexpansion
title Gaurav Personal Notes - Uninstaller Utility
color 0f

echo ==============================================================================
echo                 GAURAV PERSONAL NOTES - UNINSTALLER
echo ==============================================================================
echo.
echo Choose your uninstallation option (similar to IDM):
echo.
echo   [1] DEFAULT UNINSTALL
echo       - Terminates running processes.
echo       - Removes the application files only.
echo       - KEEPS your personal notes, SQLite database, and account settings intact.
echo.
echo   [2] FULL UNINSTALL (Complete Cleanup)
echo       - Terminates all running processes of GPN.
echo       - Completely WIPES the application and all program files.
echo       - Completely DELETES your local SQLite database, notes, cache, and logs.
echo       - Completely REMOVES all registry entries and shortcuts.
echo.
echo   [3] CANCEL (Exit without making changes)
echo.
echo ==============================================================================
set /p CHOICE="Enter your choice (1, 2, or 3): "

if "%CHOICE%"=="1" goto DEFAULT_UNINSTALL
if "%CHOICE%"=="2" goto FULL_UNINSTALL
if "%CHOICE%"=="3" goto CANCEL_EXIT
echo Invalid choice. Exiting.
goto END

:DEFAULT_UNINSTALL
echo.
echo [1/3] Terminating any running instances of Gaurav Personal Notes...
taskkill /F /IM "Gaurav Personal Notes.exe" /T >nul 2>&1
taskkill /F /IM "gpn.exe" /T >nul 2>&1
timeout /t 1 /nobreak >nul

echo [2/3] Checking for official uninstaller...
set "UNINST_PATH=%LOCALAPPDATA%\Programs\Gaurav Personal Notes\uninstall.exe"
if exist "%UNINST_PATH%" (
    echo Launching default uninstaller...
    start /wait "" "%UNINST_PATH%"
) else (
    echo Removing application program directory...
    if exist "%LOCALAPPDATA%\Programs\Gaurav Personal Notes" (
        rmdir /s /q "%LOCALAPPDATA%\Programs\Gaurav Personal Notes" >nul 2>&1
    )
)

echo [3/3] Removing desktop and start menu shortcuts...
del /f /q "%USERPROFILE%\Desktop\Gaurav Personal Notes.lnk" >nul 2>&1
del /f /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Gaurav Personal Notes.lnk" >nul 2>&1

echo.
echo ==============================================================================
echo [SUCCESS] Default uninstallation completed!
echo Your personal notes database remains safely preserved in %%APPDATA%%\com.gpn.desktop.
echo ==============================================================================
goto END

:FULL_UNINSTALL
echo.
echo ==============================================================================
echo WARNING: FULL UNINSTALL will permanently delete all local notes and settings!
echo ==============================================================================
set /p CONFIRM="Are you absolutely sure you want to completely wipe all data? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo Operation cancelled by user.
    goto END
)

echo.
echo [1/5] Terminating all running GPN processes...
taskkill /F /IM "Gaurav Personal Notes.exe" /T >nul 2>&1
taskkill /F /IM "gpn.exe" /T >nul 2>&1
timeout /t 1 /nobreak >nul

echo [2/5] Running official uninstaller if available...
set "UNINST_PATH=%LOCALAPPDATA%\Programs\Gaurav Personal Notes\uninstall.exe"
if exist "%UNINST_PATH%" (
    start /wait "" "%UNINST_PATH%" /S
)

echo [3/5] Force-deleting program files...
if exist "%LOCALAPPDATA%\Programs\Gaurav Personal Notes" (
    rmdir /s /q "%LOCALAPPDATA%\Programs\Gaurav Personal Notes" >nul 2>&1
)

echo [4/5] Completely wiping local SQLite database, notes, cache, and logs...
if exist "%APPDATA%\com.gpn.desktop" (
    rmdir /s /q "%APPDATA%\com.gpn.desktop" >nul 2>&1
)
if exist "%LOCALAPPDATA%\com.gpn.desktop" (
    rmdir /s /q "%LOCALAPPDATA%\com.gpn.desktop" >nul 2>&1
)
if exist "%APPDATA%\Gaurav Personal Notes" (
    rmdir /s /q "%APPDATA%\Gaurav Personal Notes" >nul 2>&1
)
if exist "%LOCALAPPDATA%\Gaurav Personal Notes" (
    rmdir /s /q "%LOCALAPPDATA%\Gaurav Personal Notes" >nul 2>&1
)

echo [5/5] Removing registry entries and shortcuts...
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "com.gpn.desktop" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "Gaurav Personal Notes" /f >nul 2>&1
reg delete "HKCU\Software\com.gpn.desktop" /f >nul 2>&1
reg delete "HKCU\Software\Gaurav Personal Notes" /f >nul 2>&1
del /f /q "%USERPROFILE%\Desktop\Gaurav Personal Notes.lnk" >nul 2>&1
del /f /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Gaurav Personal Notes.lnk" >nul 2>&1

echo.
echo ==============================================================================
echo [SUCCESS] FULL REMOVE COMPLETED!
echo All processes terminated, program files removed, and all local databases wiped.
echo ==============================================================================
goto END

:CANCEL_EXIT
echo.
echo Uninstallation cancelled. No changes were made.
goto END

:END
echo.
pause
