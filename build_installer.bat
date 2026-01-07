@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Компиляция установочного файла...
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" setup.iss
if %ERRORLEVEL% EQU 0 (
    echo.
    echo Установочный файл успешно создан!
    echo Файл: UTMka_Setup.exe
) else (
    echo.
    echo Ошибка при компиляции установщика!
)
pause


