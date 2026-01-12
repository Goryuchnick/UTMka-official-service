@echo off
chcp 65001 >nul
cd /d "%~dp0\.."
echo ========================================
echo Сборка UTMka.exe (PyWebView версия)
echo ========================================
echo.

REM Проверка наличия Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ОШИБКА: Python не найден в PATH!
    echo Убедитесь, что Python установлен и добавлен в PATH.
    pause
    exit /b 1
)

python scripts\build.py
if errorlevel 1 (
    echo.
    echo ✗ Ошибка сборки!
    pause
    exit /b 1
)

echo.
if exist "dist\UTMka.exe" (
    echo ✓ Сборка успешна! Файл: dist\UTMka.exe
) else (
    echo ✗ Ошибка сборки! Файл не найден.
)
echo.
pause


