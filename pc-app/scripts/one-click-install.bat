@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0.."
title Gaurav Personal Notes - One-Click Installer
color 0f

echo ==============================================================================
echo             GAURAV PERSONAL NOTES - ONE-CLICK INSTALLER
echo ==============================================================================
echo.

echo [1/4] Closing any running instances of GPN...
taskkill /F /IM "Gaurav Personal Notes.exe" /T >nul 2>&1
taskkill /F /IM "gpn.exe" /T >nul 2>&1
timeout /t 1 /nobreak >nul

echo [2/4] Verifying installation target and permissions...
set "TARGET_DIR=%LOCALAPPDATA%\Gaurav Personal Notes"
if not exist "%TARGET_DIR%" (
    mkdir "%TARGET_DIR%" >nul 2>&1
)

echo [3/4] Checking for setup bundle or binary...
set "INSTALLER_FOUND=0"

for /r "src-tauri\target\release\bundle\nsis" %%F in (*.exe) do (
    echo Found packaged NSIS installer: %%~nxF
    echo Running silent one-click install with current-user permissions...
    start /wait "" "%%F" /P
    set "INSTALLER_FOUND=1"
    goto AFTER_INSTALL
)

if "%INSTALLER_FOUND%"=="0" (
    if exist "src-tauri\target\release\gpn.exe" (
        echo Copying release executable to %TARGET_DIR%...
        copy /y "src-tauri\target\release\gpn.exe" "%TARGET_DIR%\Gaurav Personal Notes.exe" >nul
        set "INSTALLER_FOUND=1"
    ) else if exist "src-tauri\target\debug\gpn.exe" (
        echo Copying developer executable to %TARGET_DIR%...
        copy /y "src-tauri\target\debug\gpn.exe" "%TARGET_DIR%\Gaurav Personal Notes.exe" >nul
        set "INSTALLER_FOUND=1"
    )
)

:AFTER_INSTALL
echo [4/4] Creating Desktop shortcut...
powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'Gaurav Personal Notes.lnk')); $s.TargetPath = [System.IO.Path]::Combine($env:LOCALAPPDATA, 'Gaurav Personal Notes', 'Gaurav Personal Notes.exe'); $s.Save()" >nul 2>&1

echo.
echo ==============================================================================
echo [SUCCESS] One-Click Installation Complete!
echo Installed with proper user permissions in:
echo   %LOCALAPPDATA%\Programs\Gaurav Personal Notes
echo ==============================================================================
echo.

set /p LAUNCH="Do you want to launch Gaurav Personal Notes now? (Y/N, default Y): "
if /i "%LAUNCH%"=="N" goto FINISH

if exist "%TARGET_DIR%\Gaurav Personal Notes.exe" (
    start "" "%TARGET_DIR%\Gaurav Personal Notes.exe"
) else if exist "src-tauri\target\debug\gpn.exe" (
    start "" "src-tauri\target\debug\gpn.exe"
)

:FINISH
timeout /t 2 /nobreak >nul
