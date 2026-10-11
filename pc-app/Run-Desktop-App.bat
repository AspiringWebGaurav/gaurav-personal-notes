@echo off
title Gaurav Personal Notes Desktop App
cd /d "%~dp0"
echo Starting Gaurav Personal Notes Desktop Application...
start "" "src-tauri\target\debug\gpn.exe"
