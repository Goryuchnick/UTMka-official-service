import os
import PyInstaller.__main__


def main() -> None:
    base_path = os.path.dirname(os.path.abspath(__file__))
    icon_path = os.path.join(base_path, "..", "logo", "logoutm.ico")

    args = [
        os.path.join(base_path, "main.py"),
        "--name=UTMka_Native",
        "--onefile",
        "--noconsole",
        f"--icon={icon_path}",
        "--clean",
    ]

    print("Building UTMka_Native (PyQt6)...")
    PyInstaller.__main__.run(args)
    print("Build complete. Executable is in 'native_app/dist' folder.")


if __name__ == "__main__":
    main()


