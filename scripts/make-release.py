"""Собрать папку релиза UTMka: артефакты + latest.json для автообновления.

Подпись уже посчитана `tauri signer sign` и лежит в .sig рядом с установщиком.
`latest.json` Tauri локально не создаёт (его делает tauri-action в CI), поэтому
собираем руками: апдейтер приложения читает именно этот файл и без него новую
версию не увидит вовсе.
"""

import json
import pathlib
import shutil

VERSION = "3.1.1"
REPO = "https://github.com/Goryuchnick/UTMka-official-service"
BUILD = pathlib.Path(r"D:\rust\target\utmka\release")
OUT = pathlib.Path(r"D:\releases\utmka-3.1.1")

SETUP_NAME = f"UTMka 3.0_{VERSION}_x64-setup.exe"
PORTABLE_NAME = f"UTMka-portable-{VERSION}-x64.exe"

NOTES = (
    "Правка готовой ссылки прямо в результате — с разбором обратно по полям, "
    "поэтому QR, короткая ссылка и сохранение берут именно её. "
    "Системные подстановки площадок выпадающим списком: Директ, VK Реклама, Google Ads, Meta. "
    "utm_content и utm_term появились в простом режиме. "
    "Пресет ВК Рекламы переведён на двойные скобки нового кабинета."
)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    setup = BUILD / "bundle" / "nsis" / SETUP_NAME
    sig_file = BUILD / "bundle" / "nsis" / f"{SETUP_NAME}.sig"
    portable = BUILD / "utmka.exe"

    for path in (setup, sig_file, portable):
        if not path.exists():
            raise SystemExit(f"нет файла: {path}")

    shutil.copy2(setup, OUT / SETUP_NAME)
    shutil.copy2(sig_file, OUT / f"{SETUP_NAME}.sig")
    shutil.copy2(portable, OUT / PORTABLE_NAME)

    signature = sig_file.read_text(encoding="utf-8").strip()

    # Дата берётся из времени сборки, а не из «сейчас»: файл описывает
    # конкретные артефакты, и врать о их возрасте незачем.
    built = setup.stat().st_mtime
    import datetime

    pub_date = (
        datetime.datetime.fromtimestamp(built, tz=datetime.timezone.utc)
        .isoformat(timespec="seconds")
        .replace("+00:00", "Z")
    )

    latest = {
        "version": VERSION,
        "notes": NOTES,
        "pub_date": pub_date,
        "platforms": {
            # Ключ платформы — тот, что ждёт апдейтер Tauri: {target}-{arch}.
            "windows-x86_64": {
                "signature": signature,
                # Пробел в имени файла GitHub отдаёт как %20 — иначе апдейтер
                # получит 404 и промолчит.
                "url": f"{REPO}/releases/download/app-v{VERSION}/{SETUP_NAME.replace(' ', '%20')}",
            }
        },
    }

    (OUT / "latest.json").write_text(
        json.dumps(latest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print("папка релиза:", OUT)
    for item in sorted(OUT.iterdir()):
        print(f"  {item.name:44} {item.stat().st_size / 1024 / 1024:6.1f} МБ")


if __name__ == "__main__":
    main()
