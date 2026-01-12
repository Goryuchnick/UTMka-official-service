@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
cd /d "%~dp0\.."

echo ========================================
echo Building installer (QtWebEngine version)
echo ========================================
echo.

REM Check if exe exists
if not exist "dist_qtwebengine\UTMka_QtWebEngine.exe" (
    echo ERROR: File dist_qtwebengine\UTMka_QtWebEngine.exe not found!
    echo.
    echo First run: scripts\build_qtwebengine.bat
    pause
    exit /b 1
)

REM Find Inno Setup Compiler
set ISCC_PATH=
if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" (
    set "ISCC_PATH=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
) else if exist "C:\Program Files\Inno Setup 6\ISCC.exe" (
    set "ISCC_PATH=C:\Program Files\Inno Setup 6\ISCC.exe"
) else (
    echo ERROR: Inno Setup Compiler not found!
    echo.
    echo Install Inno Setup 6 and ensure ISCC.exe is in one of these paths:
    echo   - C:\Program Files (x86)\Inno Setup 6\ISCC.exe
    echo   - C:\Program Files\Inno Setup 6\ISCC.exe
    pause
    exit /b 1
)

REM Compile installer
echo Using: !ISCC_PATH!
echo Compiling: config\setup_qtwebengine.iss
echo.
"!ISCC_PATH!" "config\setup_qtwebengine.iss"

if !ERRORLEVEL! EQU 0 (
    echo.
    echo SUCCESS: Installer created successfully!
    echo File: UTMka_QtWebEngine_Setup.exe
    if exist "UTMka_QtWebEngine_Setup.exe" (
        echo.
        echo File size:
        dir "UTMka_QtWebEngine_Setup.exe" | find "UTMka_QtWebEngine_Setup.exe"
    )
) else (
    echo.
    echo ERROR: Failed to compile installer!
    echo Error code: !ERRORLEVEL!
)
echo.
pause
endlocal
