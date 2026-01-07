from __future__ import annotations

import sys

from PyQt6.QtWidgets import QApplication

from native_app.core.db import init_db
from native_app.ui.main_window import MainWindow


def main() -> None:
    # Инициализация базы данных (быстро, без WebView и Flask)
    init_db()

    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()


