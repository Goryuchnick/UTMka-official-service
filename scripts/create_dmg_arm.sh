#!/bin/bash
# Create DMG installer for macOS ARM (Apple Silicon)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "Creating DMG installer for macOS ARM"
echo "========================================"
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_ROOT"

# Check if app bundle exists
if [ ! -d "dist/UTMka.app" ]; then
    echo -e "${RED}Error: dist/UTMka.app not found!${NC}"
    echo "Please run ./scripts/build_macos_arm.sh first"
    exit 1
fi

# DMG settings
DMG_NAME="UTMka-2.0.0-macOS-ARM"
DMG_PATH="dist/${DMG_NAME}.dmg"
VOLUME_NAME="UTMka"
APP_NAME="UTMka.app"

# Clean up previous DMG
if [ -f "$DMG_PATH" ]; then
    echo "Removing previous DMG..."
    rm -f "$DMG_PATH"
fi

# Create temporary directory for DMG contents
TEMP_DMG_DIR="dist/dmg_temp"
rm -rf "$TEMP_DMG_DIR"
mkdir -p "$TEMP_DMG_DIR"

# Copy app to temp directory
echo "Preparing DMG contents..."
cp -R "dist/UTMka.app" "$TEMP_DMG_DIR/"

# Create Applications symlink
ln -s /Applications "$TEMP_DMG_DIR/Applications"

# Copy installation instructions file
if [ -f "INSTALL_MACOS.txt" ]; then
    cp "INSTALL_MACOS.txt" "$TEMP_DMG_DIR/INSTALL_MACOS.txt"
    echo "Installation instructions copied to DMG"
else
    echo "Warning: INSTALL_MACOS.txt not found, creating basic README..."
    cat > "$TEMP_DMG_DIR/README.txt" << 'EOF'
УСТАНОВКА UTMka ДЛЯ macOS

1. Перетащите UTMka.app в папку Applications
   (или дважды кликните на приложение для запуска)

2. При первом запуске macOS может показать предупреждение о безопасности.
   Если это произошло:
   - Откройте Системные настройки > Безопасность и конфиденциальность
   - Нажмите "Открыть в любом случае" рядом с сообщением о UTMka

3. Для запуска приложения:
   - Откройте Finder
   - Перейдите в Applications
   - Найдите и запустите UTMka

АЛЬТЕРНАТИВНЫЙ СПОСОБ (если macOS блокирует запуск):
   - Откройте Terminal
   - Выполните: xattr -cr /Applications/UTMka.app
   - Затем запустите приложение

---

INSTALLATION INSTRUCTIONS FOR macOS

1. Drag UTMka.app to the Applications folder
   (or double-click the app to run it)

2. On first launch, macOS may show a security warning.
   If this happens:
   - Open System Preferences > Security & Privacy
   - Click "Open Anyway" next to the UTMka message

3. To launch the application:
   - Open Finder
   - Go to Applications
   - Find and launch UTMka

ALTERNATIVE METHOD (if macOS blocks the launch):
   - Open Terminal
   - Run: xattr -cr /Applications/UTMka.app
   - Then launch the application
EOF
fi

# Create DMG
echo "Creating DMG..."
hdiutil create -volname "$VOLUME_NAME" \
    -srcfolder "$TEMP_DMG_DIR" \
    -ov -format UDZO \
    "$DMG_PATH" || {
    echo -e "${RED}Error creating DMG${NC}"
    echo "Make sure hdiutil is available"
    exit 1
}

# Clean up temp directory
rm -rf "$TEMP_DMG_DIR"

echo ""
echo -e "${GREEN}✓ DMG created successfully!${NC}"
echo "DMG file: $DMG_PATH"
echo ""
echo "File size:"
du -h "$DMG_PATH"

