#!/bin/bash
# Скрипт для запуска UTMka без предупреждений Gatekeeper
# Использование: ./launch_utmka.sh [путь_к_приложению]

# Путь по умолчанию
DEFAULT_APP_PATH="/Applications/UTMka.app"

# Используем переданный путь или путь по умолчанию
APP_PATH="${1:-$DEFAULT_APP_PATH}"

# Проверяем существование приложения
if [ ! -d "$APP_PATH" ]; then
    echo "✗ Приложение не найдено: $APP_PATH"
    echo ""
    echo "Использование:"
    echo "  ./launch_utmka.sh                    # Запуск из /Applications/UTMka.app"
    echo "  ./launch_utmka.sh /path/to/UTMka.app  # Запуск из указанного пути"
    exit 1
fi

echo "Запуск UTMka..."
echo "Путь: $APP_PATH"

# Удаляем карантин (если есть)
if xattr -l "$APP_PATH" 2>/dev/null | grep -q "com.apple.quarantine"; then
    echo "Удаление карантина..."
    xattr -d com.apple.quarantine "$APP_PATH" 2>/dev/null
    echo "✓ Карантин удалён"
fi

# Запускаем приложение
echo "Запуск приложения..."
open "$APP_PATH"

echo "✓ UTMka запущен"
