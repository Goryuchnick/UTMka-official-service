@echo off
chcp 65001 >nul
cd /d "%~dp0\.."
echo ========================================
echo Сборка UTMka_QtWebEngine.exe
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

REM Проверка наличия необходимых модулей
python -c "import PyInstaller" >nul 2>&1
if errorlevel 1 (
    echo ОШИБКА: PyInstaller не установлен!
    echo Установите зависимости: pip install -r requirements.txt
    pause
    exit /b 1
)

python -c "import PyQt6" >nul 2>&1
if errorlevel 1 (
    echo ОШИБКА: PyQt6 не установлен!
    echo Установите зависимости: pip install -r requirements.txt
    pause
    exit /b 1
)

python scripts\build_qtwebengine.py
if errorlevel 1 (
    echo.
    echo ✗ Ошибка сборки!
    pause
    exit /b 1
)

echo.
if exist "dist_qtwebengine\UTMka_QtWebEngine.exe" (
    echo ✓ Сборка успешна! Файл: dist_qtwebengine\UTMka_QtWebEngine.exe
    echo.
    echo Размер файла:
    dir "dist_qtwebengine\UTMka_QtWebEngine.exe" | find "UTMka_QtWebEngine.exe"
) else (
    echo ✗ Ошибка сборки! Файл не найден.
)
echo.
pause
