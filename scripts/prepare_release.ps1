# Скрипт для подготовки файлов релиза
# Использование: .\scripts\prepare_release.ps1

Write-Host "Подготовка файлов для релиза..." -ForegroundColor Cyan

# Определяем корневую директорию проекта (на уровень выше scripts/)
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

# Создать папки
Write-Host "Создание структуры папок..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "release\Windows" | Out-Null
New-Item -ItemType Directory -Force -Path "release\Templates" | Out-Null

# Проверка существования файлов перед копированием
$filesToCopy = @(
    @{Source = "UTMka_Setup.exe"; Dest = "release\Windows\UTMka_Setup.exe"; Required = $true},
    @{Source = "dist\UTMka.exe"; Dest = "release\Windows\UTMka.exe"; Required = $false},
    @{Source = "templates_example_ru.json"; Dest = "release\Templates\templates_example_ru.json"; Required = $true},
    @{Source = "templates_example_en.json"; Dest = "release\Templates\templates_example_en.json"; Required = $true},
    @{Source = "templates_example.csv"; Dest = "release\Templates\templates_example.csv"; Required = $false}
)

$missingFiles = @()

foreach ($file in $filesToCopy) {
    if (Test-Path $file.Source) {
        Copy-Item $file.Source -Destination $file.Dest -Force
        Write-Host "  ✓ Скопирован: $($file.Source)" -ForegroundColor Green
    } else {
        if ($file.Required) {
            $missingFiles += $file.Source
            Write-Host "  ✗ Отсутствует (обязательный): $($file.Source)" -ForegroundColor Red
        } else {
            Write-Host "  ⚠ Отсутствует (опциональный): $($file.Source)" -ForegroundColor Yellow
        }
    }
}

# Создать README для релиза
$readmeContent = @"
UTMka v2.0 - Релизные файлы

Windows/
├── UTMka_Setup.exe - Установщик приложения (рекомендуется)
└── UTMka.exe - Портативная версия (без установки)

Templates/
├── templates_example_ru.json - Шаблоны для русского рынка
├── templates_example_en.json - Шаблоны для английского рынка
└── templates_example.csv - Шаблоны в формате CSV

Инструкция по установке:
1. Запустите UTMka_Setup.exe для установки
2. Или распакуйте UTMka.exe в любую папку для портативной версии
3. Для импорта шаблонов: используйте функцию "Импорт" в приложении

Дополнительная информация:
- Сайт проекта: https://alex-pronin.ru/projects/utmka
- Telegram: https://t.me/pronin_marketing
- GitHub: https://github.com/Goryuchnick/utmKA-2.0
"@

$readmeContent | Out-File -FilePath "release\README_RELEASE.txt" -Encoding UTF8
Write-Host "  ✓ Создан README_RELEASE.txt" -ForegroundColor Green

# Итоговый отчет
Write-Host "`nИтоговый отчет:" -ForegroundColor Cyan
Write-Host "  Папка релиза: release\" -ForegroundColor White

if ($missingFiles.Count -eq 0) {
    Write-Host "`n✓ Все обязательные файлы подготовлены!" -ForegroundColor Green
} else {
    Write-Host "`n⚠ Внимание! Отсутствуют обязательные файлы:" -ForegroundColor Yellow
    foreach ($file in $missingFiles) {
        Write-Host "  - $file" -ForegroundColor Yellow
    }
    Write-Host "`nУбедитесь, что сначала выполнены сборка .exe и создание установщика." -ForegroundColor Yellow
}

Write-Host "`nГотово! Файлы подготовлены в папке release\" -ForegroundColor Green

