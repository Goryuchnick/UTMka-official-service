import PyInstaller.__main__
import os
import shutil
import sys

# Define paths - ensure we're in the right directory
if getattr(sys, 'frozen', False):
    base_path = os.path.dirname(sys.executable)
else:
    # Get the directory where this script is located
    if __file__:
        base_path = os.path.dirname(os.path.abspath(__file__))
    else:
        # Fallback: use current working directory
        base_path = os.getcwd()

# Change to the script directory
try:
    os.chdir(base_path)
    print(f"Working directory: {os.getcwd()}")
except Exception as e:
    print(f"Warning: Could not change directory: {e}")

icon_path = os.path.join(base_path, 'logo', 'logoutm.ico')
app_name = "UTMka"

# Cleanup previous builds
if os.path.exists('build'):
    shutil.rmtree('build')
if os.path.exists('dist'):
    shutil.rmtree('dist')

print(f"Building {app_name}...")

# PyInstaller arguments
args = [
    'app.py',                           # Main script
    f'--name={app_name}',               # Name of the executable
    '--onefile',                        # Create a single executable file
    '--noconsole',                      # Do not show a console window
    f'--icon={icon_path}',              # Icon file
    '--clean',                          # Clean PyInstaller cache
    
    # Add data files (source;dest)
    # Using os.pathsep to separate source and dest if needed, but PyInstaller uses pathsep in --add-data
    # Syntax: source_path:dest_path (on Windows use ;)
    f'--add-data=templates_example.json;.',
    f'--add-data=templates_example_ru.json;.',
    f'--add-data=templates_example_en.json;.',
    f'--add-data=templates_example.csv;.',
    f'--add-data=index.html;.',
    
    # Add folders
    f'--add-data=logo;logo',
    f'--add-data=downloads;downloads', # Should exist or be created
    
    # Hidden imports for dependencies
    '--hidden-import=jaraco.text',      # Fix for pkg_resources issue
    '--hidden-import=webview',          # PyWebView
    '--hidden-import=flask',             # Flask
    '--hidden-import=werkzeug',          # Werkzeug (Flask dependency)
    '--hidden-import=sqlite3',           # SQLite
    '--hidden-import=tkinter',           # Tkinter for file dialogs
    '--hidden-import=tkinter.filedialog', # Tkinter file dialogs
    '--hidden-import=requests',          # Requests library
]

# Ensure downloads folder exists for the build content
if not os.path.exists('downloads'):
    os.makedirs('downloads')

# Run PyInstaller
PyInstaller.__main__.run(args)

print("Build complete. Executable is in 'dist' folder.")
