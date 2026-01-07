@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo ОТПРАВКА В РЕПОЗИТОРИЙ UTMka-official-service
echo ============================================================
echo.

echo 1. Удаление старого git репозитория...
if exist .git (
    rmdir /s /q .git
    echo    ✓ Старый репозиторий удален
)

echo.
echo 2. Инициализация git репозитория...
git init
if %errorlevel% == 0 (
    echo    ✓ Репозиторий инициализирован
) else (
    echo    ✗ Ошибка инициализации
    pause
    exit /b 1
)

echo.
echo 3. Добавление файлов...
git add .
echo    ✓ Файлы добавлены

echo.
echo 4. Создание коммита...
git commit -m "Initial commit: UTMka official service"
if %errorlevel% == 0 (
    echo    ✓ Коммит создан
) else (
    echo    ⚠ Нет изменений для коммита или ошибка
)

echo.
echo 5. Переименование ветки в main...
git branch -M main
echo    ✓ Ветка: main

echo.
echo 6. Добавление remote репозитория...
git remote remove origin 2>nul
git remote add origin https://github.com/Goryuchnick/UTMka-official-service.git
echo    ✓ Remote добавлен

echo.
echo 7. Отправка на GitHub...
git push -u origin main
if %errorlevel% == 0 (
    echo.
    echo ============================================================
    echo ГОТОВО! Проект успешно отправлен на GitHub!
    echo ============================================================
    echo.
    echo Репозиторий: https://github.com/Goryuchnick/UTMka-official-service
    echo Ветка: main
) else (
    echo.
    echo ✗ Ошибка при отправке. Проверьте:
    echo   - Репозиторий создан на GitHub
    echo   - У вас есть права на запись
    echo   - Интернет соединение работает
)

echo.
pause

