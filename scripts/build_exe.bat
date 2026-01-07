@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo Сборка UTMka.exe
echo ========================================
echo.
python build.py
echo.
if exist "dist\UTMka.exe" (
    echo ✓ Сборка успешна! Файл: dist\UTMka.exe
    echo.
    echo Размер файла:
    dir "dist\UTMka.exe" | find "UTMka.exe"
) else (
    echo ✗ Ошибка сборки!
)
echo.
pause


