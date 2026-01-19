from __future__ import annotations

from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import (
    QMainWindow,
    QWidget,
    QVBoxLayout,
    QFormLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPushButton,
    QTextEdit,
    QMessageBox,
)

from native_app.core import services


class MainWindow(QMainWindow):
    """
    Простое нативное окно UTMka без WebView.
    Позволяет:
    - собирать UTM-ссылку;
    - сохранять её в историю.
    """

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setWindowTitle("UTMka (Native)")
        self.resize(1200, 900)

        central = QWidget(self)
        self.setCentralWidget(central)

        root_layout = QVBoxLayout()
        central.setLayout(root_layout)

        form = QFormLayout()

        self.base_url_edit = QLineEdit()
        self.utm_source_edit = QLineEdit()
        self.utm_medium_edit = QLineEdit()
        self.utm_campaign_edit = QLineEdit()
        self.utm_content_edit = QLineEdit()
        self.utm_term_edit = QLineEdit()
        self.user_email_edit = QLineEdit()

        form.addRow(QLabel("Базовый URL:"), self.base_url_edit)
        form.addRow(QLabel("utm_source:"), self.utm_source_edit)
        form.addRow(QLabel("utm_medium:"), self.utm_medium_edit)
        form.addRow(QLabel("utm_campaign:"), self.utm_campaign_edit)
        form.addRow(QLabel("utm_content:"), self.utm_content_edit)
        form.addRow(QLabel("utm_term:"), self.utm_term_edit)
        form.addRow(QLabel("Email пользователя (для истории):"), self.user_email_edit)

        root_layout.addLayout(form)

        buttons_layout = QHBoxLayout()
        self.generate_button = QPushButton("Сгенерировать ссылку")
        self.save_history_button = QPushButton("Сохранить в историю")
        buttons_layout.addWidget(self.generate_button)
        buttons_layout.addWidget(self.save_history_button)

        root_layout.addLayout(buttons_layout)

        root_layout.addWidget(QLabel("Результат:"))
        self.result_edit = QTextEdit()
        self.result_edit.setReadOnly(True)
        self.result_edit.setMaximumHeight(150)
        root_layout.addWidget(self.result_edit, stretch=1)

        # История (упрощенно: просто текстом)
        root_layout.addWidget(QLabel("История (последние записи):"))
        self.history_view = QTextEdit()
        self.history_view.setReadOnly(True)
        self.history_view.setLineWrapMode(QTextEdit.LineWrapMode.NoWrap)
        root_layout.addWidget(self.history_view, stretch=2)

        # Сигналы
        self.generate_button.clicked.connect(self.on_generate_clicked)
        self.save_history_button.clicked.connect(self.on_save_history_clicked)

    # --- Слот: генерация ссылки ---

    def on_generate_clicked(self) -> None:
        base_url = self.base_url_edit.text().strip()
        if not base_url:
            QMessageBox.warning(self, "Ошибка", "Введите базовый URL")
            return

        full_url = services.build_utm_url(
            base_url=base_url,
            utm_source=self.utm_source_edit.text().strip() or None,
            utm_medium=self.utm_medium_edit.text().strip() or None,
            utm_campaign=self.utm_campaign_edit.text().strip() or None,
            utm_content=self.utm_content_edit.text().strip() or None,
            utm_term=self.utm_term_edit.text().strip() or None,
        )
        self.result_edit.setPlainText(full_url)

    # --- Слот: сохранить в историю ---

    def on_save_history_clicked(self) -> None:
        full_url = self.result_edit.toPlainText().strip()
        if not full_url:
            QMessageBox.warning(self, "Ошибка", "Сначала сгенерируйте ссылку")
            return

        user_email = self.user_email_edit.text().strip()
        if not user_email:
            QMessageBox.warning(self, "Ошибка", "Введите email пользователя")
            return

        try:
            services.add_history_item(user_email=user_email, full_url=full_url)
        except Exception as exc:  # pragma: no cover - защита от неожиданных ошибок
            QMessageBox.critical(
                self,
                "Ошибка",
                f"Не удалось сохранить историю:\n{exc}",
            )
            return

        self.load_history(user_email)
        QMessageBox.information(self, "Готово", "Запись добавлена в историю")

    def load_history(self, user_email: str) -> None:
        """Загружает историю для указанного email и показывает в текстовом поле."""
        try:
            items = services.get_history(user_email=user_email, limit=100)
        except Exception as exc:  # pragma: no cover
            self.history_view.setPlainText(f"Ошибка загрузки истории: {exc}")
            return

        lines = []
        for item in items:
            lines.append(
                f"[{item.get('created_at', '')}] {item.get('full_url', '')}"
            )
        self.history_view.setPlainText("\n".join(lines))


