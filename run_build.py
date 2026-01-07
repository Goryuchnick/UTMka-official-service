# -*- coding: utf-8 -*-
import os
import sys

# Получаем путь к скрипту
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

# Запускаем build.py
exec(open('build.py', encoding='utf-8').read())


