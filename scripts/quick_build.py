#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Быстрая сборка приложения"""
import subprocess
import os
import sys

# Определяем путь к скрипту
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

print(f"Текущая директория: {os.getcwd()}")
print(f"Запуск сборки...")

# Запускаем build.py как модуль
try:
    result = subprocess.run([sys.executable, "build.py"], 
                          cwd=script_dir,
                          encoding='utf-8',
                          errors='replace')
    sys.exit(result.returncode)
except Exception as e:
    print(f"Ошибка при запуске сборки: {e}")
    sys.exit(1)


