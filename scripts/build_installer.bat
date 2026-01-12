@echo off
chcp 65001 >nul
cd /d "%~dp0\.."

REM Проверка аргументов
set BUILD_TYPE=%1
if "%BUILD_TYPE%"=="" set BUILD_TYPE=standard

echo ========================================
if "%BUILD_TYPE%"=="qtwebengine" (
    echo Компиляция установочного файла (QtWebEngine версия)...
    set SETUP_FILE=config\setup_qtwebengine.iss
    set EXE_NAME=UTMka_QtWebEngine_Setup.exe
    set DIST_DIR=dist_qtwebengine
    set EXE_FILE=UTMka_QtWebEngine.exe
) else (
    echo Компиляция установочного файла (PyWebView версия)...
    set SETUP_FILE=config\setup.iss
    set EXE_NAME=UTMka_Setup.exe
    set DIST_DIR=dist
    set EXE_FILE=UTMka.exe
)
echo ========================================
echo.

REM Проверка наличия exe файла
if not exist "%DIST_DIR%\%EXE_FILE%" (
    echo ОШИБКА: Файл %DIST_DIR%\%EXE_FILE% не найден!
    echo.
    if "%BUILD_TYPE%"=="qtwebengine" (
        echo Сначала запустите: scripts\build_qtwebengine.bat
    ) else (
        echo Сначала запустите: scripts\build_exe.bat
    )
    pause
    exit /b 1
)

REM Поиск Inno Setup Compiler
set ISCC_PATH=
if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" (
    set ISCC_PATH=C:\Program Files (x86)\Inno Setup 6\ISCC.exe
) else if exist "C:\Program Files\Inno Setup 6\ISCC.exe" (
    set ISCC_PATH=C:\Program Files\Inno Setup 6\ISCC.exe
) else (
    echo ОШИБКА: Inno Setup Compiler не найден!
    echo.
    echo Установите Inno Setup 6 и убедитесь, что ISCC.exe находится в одном из путей:
    echo   - C:\Program Files (x86)\Inno Setup 6\ISCC.exe
    echo   - C:\Program Files\Inno Setup 6\ISCC.exe
    echo.
    echo Или укажите путь к ISCC.exe в переменной ISCC_PATH в этом файле.
    pause
    exit /b 1
)

REM Компиляция установщика
echo Используется: %ISCC_PATH%
echo Компилируется: %SETUP_FILE%
echo.
"%ISCC_PATH%" "%SETUP_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ Установочный файл успешно создан!
    echo Файл: %EXE_NAME%
    if exist "%EXE_NAME%" (
        echo.
        echo Размер файла:
        dir "%EXE_NAME%" | find "%EXE_NAME%"
    )
) else (
    echo.
    echo ✗ Ошибка при компиляции установщика!
    echo Код ошибки: %ERRORLEVEL%
)
echo.
pause



