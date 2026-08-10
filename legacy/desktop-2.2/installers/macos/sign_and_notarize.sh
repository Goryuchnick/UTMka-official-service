#!/bin/bash
# Подпись и нотаризация для Apple Developer Account
# Требует: Apple Developer ID Application certificate
#
# Использование:
#   1. Установите Developer ID certificate в Keychain
#   2. Заполните переменные ниже (DEVELOPER_ID, APPLE_ID, TEAM_ID, APP_PASSWORD)
#   3. Запустите: ./sign_and_notarize.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DIST_DIR="$PROJECT_ROOT/dist"

APP_PATH="$DIST_DIR/UTMka.app"
DMG_PATH="$DIST_DIR/UTMka-"$(python3 -c "import sys; sys.path.insert(0, '$PROJECT_ROOT'); from src.core.version import __version__; print(__version__)")"-macOS.dmg"

# ============================================
# НАСТРОЙКИ (заполните перед использованием)
# ============================================

# Developer ID (найдите в Keychain Access → Certificates)
# Формат: "Developer ID Application: Your Name (XXXXXXXXXX)"
DEVELOPER_ID="Developer ID Application: Your Name (XXXXXXXXXX)"

# Apple ID для нотаризации
APPLE_ID="your@email.com"

# Team ID (найдите в Apple Developer Portal)
TEAM_ID="XXXXXXXXXX"

# App-specific password (создайте в appleid.apple.com)
APP_PASSWORD="xxxx-xxxx-xxxx-xxxx"

# ============================================
# ПРОВЕРКИ
# ============================================

if [ ! -d "$APP_PATH" ]; then
    echo "✗ UTMka.app не найден: $APP_PATH"
    echo "  Сначала запустите: python installers/macos/build.py"
    exit 1
fi

if [ -z "$DEVELOPER_ID" ] || [ "$DEVELOPER_ID" = "Developer ID Application: Your Name (XXXXXXXXXX)" ]; then
    echo "✗ Не настроен DEVELOPER_ID"
    echo "  Откройте скрипт и заполните переменные в начале файла"
    exit 1
fi

# Проверяем наличие сертификата
if ! security find-identity -v -p codesigning | grep -q "$DEVELOPER_ID"; then
    echo "✗ Сертификат не найден в Keychain: $DEVELOPER_ID"
    echo "  Установите Developer ID Application certificate"
    exit 1
fi

# ============================================
# ПОДПИСЬ ПРИЛОЖЕНИЯ
# ============================================

echo "=== Подпись приложения ==="

# Подписываем все вложенные библиотеки и исполняемые файлы
find "$APP_PATH" -type f -name "*.so" -o -name "*.dylib" | while read lib; do
    codesign --force --sign "$DEVELOPER_ID" --timestamp --options runtime "$lib" || true
done

# Подписываем основной исполняемый файл
codesign --force --sign "$DEVELOPER_ID" \
    --timestamp \
    --options runtime \
    --deep \
    --verbose \
    "$APP_PATH"

echo "=== Проверка подписи ==="
codesign --verify --verbose "$APP_PATH"
codesign -dv --verbose=4 "$APP_PATH"

# ============================================
# НОТАРИЗАЦИЯ
# ============================================

echo "=== Нотаризация ==="

# Создаём zip для отправки
ZIP_PATH="$DIST_DIR/UTMka.zip"
if [ -f "$ZIP_PATH" ]; then
    rm "$ZIP_PATH"
fi

ditto -c -k --keepParent "$APP_PATH" "$ZIP_PATH"

# Отправляем на нотаризацию
echo "Отправка на нотаризацию..."
NOTARIZATION_ID=$(xcrun notarytool submit "$ZIP_PATH" \
    --apple-id "$APPLE_ID" \
    --team-id "$TEAM_ID" \
    --password "$APP_PASSWORD" \
    --wait \
    --timeout 30m | grep -i "id:" | awk '{print $2}')

if [ -z "$NOTARIZATION_ID" ]; then
    echo "✗ Ошибка нотаризации"
    exit 1
fi

echo "✓ Нотаризация завершена: $NOTARIZATION_ID"

# ============================================
# STAPLING (прикрепление тикета)
# ============================================

echo "=== Stapling ==="
xcrun stapler staple "$APP_PATH"

# Проверяем stapling
xcrun stapler validate "$APP_PATH"

# ============================================
# ПОДПИСЬ DMG (если есть)
# ============================================

if [ -f "$DMG_PATH" ]; then
    echo "=== Подпись DMG ==="
    codesign --force --sign "$DEVELOPER_ID" \
        --timestamp \
        --verbose \
        "$DMG_PATH"
    
    codesign --verify --verbose "$DMG_PATH"
fi

# ============================================
# ОЧИСТКА
# ============================================

rm -f "$ZIP_PATH"

echo ""
echo "=== Готово! ==="
echo "  Приложение: $APP_PATH"
if [ -f "$DMG_PATH" ]; then
    echo "  DMG: $DMG_PATH"
fi
echo ""
echo "✓ Приложение подписано и нотаризовано"
echo "  Пользователи смогут открыть его без предупреждений"
