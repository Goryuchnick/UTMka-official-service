#!/bin/bash
# Скрипт для автоматической установки UTMka из DMG
# Использование: ./install_from_dmg.sh [путь_к_dmg]

# Путь по умолчанию (ищем в текущей директории)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEFAULT_DMG_PATH="$PROJECT_ROOT/dist/UTMka-*.dmg"

# Используем переданный путь или ищем в dist/
if [ -n "$1" ]; then
    DMG_PATH="$1"
else
    # Ищем последний DMG в dist/
    DMG_PATH=$(ls -t $DEFAULT_DMG_PATH 2>/dev/null | head -1)
fi

# Проверяем существование DMG
if [ -z "$DMG_PATH" ] || [ ! -f "$DMG_PATH" ]; then
    echo "✗ DMG файл не найден"
    echo ""
    echo "Использование:"
    echo "  ./install_from_dmg.sh                    # Автопоиск в dist/"
    echo "  ./install_from_dmg.sh /path/to/file.dmg   # Указать путь к DMG"
    exit 1
fi

echo "Установка UTMka из DMG..."
echo "Файл: $DMG_PATH"

# Удаляем карантин с DMG
if xattr -l "$DMG_PATH" 2>/dev/null | grep -q "com.apple.quarantine"; then
    echo "Удаление карантина с DMG..."
    xattr -d com.apple.quarantine "$DMG_PATH" 2>/dev/null
fi

# Монтируем DMG
MOUNT_POINT="/Volumes/UTMka"
APP_NAME="UTMka.app"
INSTALL_PATH="/Applications"

echo "Монтирование DMG..."
hdiutil attach "$DMG_PATH" -nobrowse -quiet

# Проверяем, что DMG смонтирован
if [ ! -d "$MOUNT_POINT/$APP_NAME" ]; then
    echo "✗ Не удалось найти $APP_NAME в DMG"
    hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null
    exit 1
fi

# Удаляем старое приложение (если есть)
if [ -d "$INSTALL_PATH/$APP_NAME" ]; then
    echo "Удаление старой версии..."
    rm -rf "$INSTALL_PATH/$APP_NAME"
fi

# Копируем приложение
echo "Копирование приложения в $INSTALL_PATH..."
cp -R "$MOUNT_POINT/$APP_NAME" "$INSTALL_PATH/"

# Удаляем карантин с установленного приложения
echo "Удаление карантина с приложения..."
xattr -d com.apple.quarantine "$INSTALL_PATH/$APP_NAME" 2>/dev/null

# Отмонтируем DMG
echo "Отмонтирование DMG..."
hdiutil detach "$MOUNT_POINT" -quiet

echo ""
echo "✓ UTMka установлен в $INSTALL_PATH/$APP_NAME"
echo ""
echo "Запустить приложение? (y/n)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    open "$INSTALL_PATH/$APP_NAME"
fi
