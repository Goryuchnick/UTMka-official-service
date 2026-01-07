#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Скрипт для отправки проекта в новый репозиторий UTMka-official-service
"""
import subprocess
import os
import sys
import shutil

# Получаем директорию, где находится этот скрипт
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

print(f"Рабочая директория: {script_dir}")
print("\n" + "="*60)
print("ОТПРАВКА В РЕПОЗИТОРИЙ UTMka-official-service")
print("="*60)

repo_url = "https://github.com/Goryuchnick/UTMka-official-service.git"
branch = "main"

# Удаляем старый .git если есть
if os.path.exists(".git"):
    print("\n1. Удаление старого git репозитория...")
    try:
        shutil.rmtree(".git")
        print("   ✓ Старый репозиторий удален")
    except Exception as e:
        print(f"   ⚠ Ошибка: {e}")

# Инициализируем новый репозиторий
print("\n2. Инициализация git репозитория...")
result = subprocess.run(["git", "init"], cwd=script_dir, capture_output=True, text=True, encoding='utf-8')
if result.returncode == 0:
    print("   ✓ Репозиторий инициализирован")
else:
    print(f"   ✗ Ошибка: {result.stderr}")
    sys.exit(1)

# Добавляем файлы
print("\n3. Добавление файлов...")
result = subprocess.run(["git", "add", "."], cwd=script_dir, capture_output=True, text=True, encoding='utf-8')
if result.stderr and "Permission denied" not in result.stderr:
    print(f"   Предупреждения: {result.stderr}")
print("   ✓ Файлы добавлены")

# Создаем коммит
print("\n4. Создание коммита...")
result = subprocess.run(
    ["git", "commit", "-m", "Initial commit: UTMka official service"],
    cwd=script_dir,
    capture_output=True,
    text=True,
    encoding='utf-8'
)
if result.returncode == 0:
    print("   ✓ Коммит создан")
elif "nothing to commit" in result.stdout.lower():
    print("   ℹ Нет изменений для коммита")
else:
    print(f"   ⚠ {result.stdout}")
    if result.stderr:
        print(f"   ⚠ {result.stderr}")

# Переименовываем ветку
print("\n5. Переименование ветки в main...")
subprocess.run(["git", "branch", "-M", branch], cwd=script_dir, check=False)
print(f"   ✓ Ветка: {branch}")

# Добавляем remote
print("\n6. Добавление remote репозитория...")
result = subprocess.run(["git", "remote", "-v"], cwd=script_dir, capture_output=True, text=True, encoding='utf-8')
if "origin" in result.stdout:
    subprocess.run(["git", "remote", "set-url", "origin", repo_url], cwd=script_dir, check=False)
    print(f"   ✓ Remote обновлен: {repo_url}")
else:
    subprocess.run(["git", "remote", "add", "origin", repo_url], cwd=script_dir, check=False)
    print(f"   ✓ Remote добавлен: {repo_url}")

# Отправляем
print("\n7. Отправка на GitHub...")
result = subprocess.run(
    ["git", "push", "-u", "origin", branch],
    cwd=script_dir,
    capture_output=True,
    text=True,
    encoding='utf-8'
)

if result.returncode == 0:
    print("   ✓ Проект успешно отправлен на GitHub!")
    print("\n" + "="*60)
    print("ГОТОВО!")
    print("="*60)
    print(f"\nРепозиторий: {repo_url}")
    print(f"Ветка: {branch}")
else:
    print(f"   ✗ Ошибка: {result.stderr}")
    if "src refspec main does not match" in result.stderr:
        print("\n   ⚠ Проблема: нет коммитов. Проверьте, что файлы добавлены.")
    sys.exit(1)

