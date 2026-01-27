@echo off
chcp 65001 > nul
echo ========================================
echo UTMka Desktop (модульная версия)
echo ========================================
echo.
echo Entry point: src/desktop/main.py
echo Frontend: frontend/ (ES6 modules)
echo Database: %%AppData%%\Roaming\UTMka\databases\utmka.db
echo.
echo Нажмите Ctrl+C для остановки
echo ========================================
echo.

python -m src.desktop.main

pause
