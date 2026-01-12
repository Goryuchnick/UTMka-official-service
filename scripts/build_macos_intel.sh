#!/bin/bash
# Build script for macOS Intel (x86_64)

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "Building UTMka for macOS Intel (x86_64)"
echo "========================================"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_ROOT"

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}Error: This script must be run on macOS${NC}"
    exit 1
fi

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: python3 is not installed${NC}"
    exit 1
fi

# Check if PyInstaller is installed
if ! python3 -c "import PyInstaller" 2>/dev/null; then
    echo -e "${YELLOW}Installing PyInstaller...${NC}"
    pip3 install pyinstaller
fi

# Check if required packages are installed
echo "Checking dependencies..."
python3 -c "import flask, PyQt6, PyQt6.QtWebEngineWidgets" 2>/dev/null || {
    echo -e "${YELLOW}Installing required packages...${NC}"
    pip3 install -r requirements.txt
}

# Check for .icns icon file
if [ ! -f "logo/logoutm.icns" ]; then
    echo -e "${YELLOW}Warning: logo/logoutm.icns not found${NC}"
    echo "Creating .icns from .png (requires iconutil)..."
    if [ -f "logo/logoutm.png" ]; then
        # Create iconset directory
        mkdir -p logo/logoutm.iconset
        
        # Create different sizes (macOS requires multiple sizes)
        sips -z 16 16 logo/logoutm.png --out logo/logoutm.iconset/icon_16x16.png 2>/dev/null || echo "Warning: sips not available, skipping icon creation"
        sips -z 32 32 logo/logoutm.png --out logo/logoutm.iconset/icon_16x16@2x.png 2>/dev/null || true
        sips -z 32 32 logo/logoutm.png --out logo/logoutm.iconset/icon_32x32.png 2>/dev/null || true
        sips -z 64 64 logo/logoutm.png --out logo/logoutm.iconset/icon_32x32@2x.png 2>/dev/null || true
        sips -z 128 128 logo/logoutm.png --out logo/logoutm.iconset/icon_128x128.png 2>/dev/null || true
        sips -z 256 256 logo/logoutm.png --out logo/logoutm.iconset/icon_128x128@2x.png 2>/dev/null || true
        sips -z 256 256 logo/logoutm.png --out logo/logoutm.iconset/icon_256x256.png 2>/dev/null || true
        sips -z 512 512 logo/logoutm.png --out logo/logoutm.iconset/icon_256x256@2x.png 2>/dev/null || true
        sips -z 512 512 logo/logoutm.png --out logo/logoutm.iconset/icon_512x512.png 2>/dev/null || true
        sips -z 1024 1024 logo/logoutm.png --out logo/logoutm.iconset/icon_512x512@2x.png 2>/dev/null || true
        
        # Create .icns file
        iconutil -c icns logo/logoutm.iconset -o logo/logoutm.icns 2>/dev/null || echo "Warning: Could not create .icns file"
        
        # Clean up iconset
        rm -rf logo/logoutm.iconset 2>/dev/null || true
    fi
fi

# Ensure downloads directory exists
mkdir -p downloads

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf build dist

# Build with PyInstaller
echo "Building application..."
python3 -m PyInstaller UTMka_macos_intel.spec --clean --noconfirm

# Check if build was successful
if [ -d "dist/UTMka.app" ]; then
    echo ""
    echo -e "${GREEN}✓ Build successful!${NC}"
    echo "Application bundle: dist/UTMka.app"
    echo ""
    echo "To create a DMG installer, run:"
    echo "  ./scripts/create_dmg_intel.sh"
    echo ""
else
    echo -e "${RED}✗ Build failed!${NC}"
    exit 1
fi

