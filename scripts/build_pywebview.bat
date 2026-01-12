@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
cd /d "%~dp0\.."

echo ========================================
echo Building UTMka.exe (PyWebView version)
echo ========================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found in PATH!
    echo Make sure Python is installed and added to PATH.
    pause
    exit /b 1
)

REM Check PyInstaller
python -c "import PyInstaller" >nul 2>&1
if errorlevel 1 (
    echo ERROR: PyInstaller is not installed!
    echo Install dependencies: pip install -r requirements.txt
    pause
    exit /b 1
)

REM Build
echo Building...
python scripts\build.py
if errorlevel 1 (
    echo.
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
if exist "dist\UTMka.exe" (
    echo SUCCESS: Build completed!
    echo File: dist\UTMka.exe
    echo.
    echo File size:
    dir "dist\UTMka.exe" | find "UTMka.exe"
) else (
    echo ERROR: Build failed! File not found.
)
echo.
pause
endlocal
