@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
cd /d "%~dp0\.."

echo ========================================
echo Building all versions
echo ========================================
echo.

REM Build PyWebView version
echo [1/2] Building PyWebView version...
call scripts\build_pywebview.bat
if errorlevel 1 (
    echo.
    echo Failed to build PyWebView version!
    pause
    exit /b 1
)

echo.
echo [2/2] Building QtWebEngine version...
call scripts\build_qtwebengine.bat
if errorlevel 1 (
    echo.
    echo Failed to build QtWebEngine version!
    pause
    exit /b 1
)

echo.
echo ========================================
echo All builds completed successfully!
echo ========================================
echo.
pause
endlocal
