@echo off
chcp 65001 > nul
echo Запуск UTMka в режиме браузера для диагностики...
echo.
echo После запуска откройте в браузере:
echo   http://127.0.0.1:5000/?diag=1
echo.
echo Для открытия панели диагностики нажмите Ctrl+Alt+D
echo Для просмотра логов: http://127.0.0.1:5000/diag_log
echo.
echo Нажмите Ctrl+C для остановки сервера
echo.
python app.py --headless

