import PyInstaller.__main__
import os
import shutil

# Define paths
base_path = os.path.dirname(os.path.abspath(__file__))
icon_path = os.path.join(base_path, 'logo', 'logoutm.ico')
app_name = "UTMka_QtWebEngine"

# Cleanup previous builds
build_dir = os.path.join(base_path, 'build')
dist_dir = os.path.join(base_path, 'dist_qtwebengine')
if os.path.exists(build_dir):
    shutil.rmtree(build_dir)
if os.path.exists(dist_dir):
    shutil.rmtree(dist_dir)

print(f"Building {app_name}...")

# PyInstaller arguments
args = [
    'app_qtwebengine.py',              # Main script
    f'--name={app_name}',               # Name of the executable
    '--onefile',                        # Create a single executable file
    '--noconsole',                      # Do not show a console window
    f'--icon={icon_path}',              # Icon file
    '--clean',                          # Clean PyInstaller cache
    
    # Add data files (source;dest)
    # Using os.pathsep to separate source and dest if needed, but PyInstaller uses pathsep in --add-data
    # Syntax: source_path:dest_path (on Windows use ;)
    f'--add-data=templates_example.json;.',
    f'--add-data=templates_example.csv;.',
    f'--add-data=index.html;.',
    
    # Add folders
    f'--add-data=logo;logo',
    f'--add-data=downloads;downloads', # Should exist or be created
    
    # Hidden imports for dependencies
    '--hidden-import=jaraco.text',      # Fix for pkg_resources issue
    '--hidden-import=flask',             # Flask
    '--hidden-import=werkzeug',          # Werkzeug (Flask dependency)
    '--hidden-import=sqlite3',           # SQLite
    '--hidden-import=tkinter',           # Tkinter for file dialogs
    '--hidden-import=tkinter.filedialog', # Tkinter file dialogs
    '--hidden-import=requests',          # Requests library
    '--hidden-import=PyQt6',             # PyQt6
    '--hidden-import=PyQt6.QtCore',     # Qt Core
    '--hidden-import=PyQt6.QtWidgets',  # Qt Widgets
    '--hidden-import=PyQt6.QtWebEngineWidgets', # Qt WebEngine
    '--hidden-import=PyQt6.QtGui',      # Qt GUI
    '--collect-all=PyQt6',               # Collect all PyQt6 modules
    '--collect-all=PyQt6.QtWebEngineWidgets', # Collect WebEngine resources
]

# Ensure downloads folder exists for the build content
downloads_dir = os.path.join(base_path, 'downloads')
if not os.path.exists(downloads_dir):
    os.makedirs(downloads_dir)

# Run PyInstaller
PyInstaller.__main__.run(args)

# Move dist to dist_qtwebengine if needed
if os.path.exists('dist'):
    if os.path.exists(dist_dir):
        shutil.rmtree(dist_dir)
    os.rename('dist', dist_dir)
    print(f"\nBuild complete. Executable is in '{dist_dir}' folder.")
else:
    print("Build complete. Executable is in 'dist' folder.")

