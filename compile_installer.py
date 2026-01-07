#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Скрипт для компиляции установочного файла UTMka"""

import os
import subprocess
import sys

def main():
    # Получаем директорию скрипта
    if __file__:
        script_dir = os.path.dirname(os.path.abspath(__file__))
    else:
        # Если запущено напрямую, используем текущую директорию
        script_dir = os.getcwd()
    
    # Переходим в директорию скрипта
    os.chdir(script_dir)
    
    setup_iss = os.path.join(script_dir, 'setup.iss')
    
    # Проверяем наличие setup.iss
    if not os.path.exists(setup_iss):
        print(f"Ошибка: Файл setup.iss не найден в {script_dir}")
        sys.exit(1)
    
    # Проверяем наличие exe файла
    exe_path = os.path.join(script_dir, 'dist', 'UTMka.exe')
    if not os.path.exists(exe_path):
        print(f"Ошибка: Файл {exe_path} не найден!")
        print("Пожалуйста, сначала запустите build.py для создания исполняемого файла.")
        sys.exit(1)
    
    # Пути к Inno Setup Compiler
    iscc_paths = [
        r"C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
        r"C:\Program Files\Inno Setup 6\ISCC.exe",
    ]
    
    iscc = None
    for path in iscc_paths:
        if os.path.exists(path):
            iscc = path
            break
    
    if not iscc:
        print("Ошибка: Inno Setup Compiler не найден!")
        print("Пожалуйста, установите Inno Setup 6 из https://jrsoftware.org/isinfo.php")
        sys.exit(1)
    
    print("Компиляция установочного файла...")
    print(f"Используется: {iscc}")
    print(f"Скрипт: {setup_iss}")
    print()
    
    # Запускаем компиляцию
    try:
        result = subprocess.run(
            [iscc, setup_iss],
            cwd=script_dir,
            check=True,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace'
        )
        
        print(result.stdout)
        
        # Проверяем результат
        output_file = os.path.join(script_dir, 'UTMka_Setup.exe')
        if os.path.exists(output_file):
            size_mb = os.path.getsize(output_file) / (1024 * 1024)
            print()
            print("=" * 50)
            print("Установочный файл успешно создан!")
            print(f"Файл: {output_file}")
            print(f"Размер: {size_mb:.2f} MB")
            print("=" * 50)
        else:
            print("Предупреждение: Установочный файл не найден после компиляции.")
            
    except subprocess.CalledProcessError as e:
        print("Ошибка при компиляции установщика!")
        print(f"Код возврата: {e.returncode}")
        if e.stdout:
            print("Вывод:")
            print(e.stdout)
        if e.stderr:
            print("Ошибки:")
            print(e.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Неожиданная ошибка: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()

