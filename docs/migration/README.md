# UTMka 3.0 Migration Guide

## Обзор

Этот документ описывает план модернизации проекта UTMka до версии 3.0 с новой архитектурой.

**Статус:** Подготовка завершена. Удалены дублирующиеся файлы, созданы инструкции.

---

## Содержание папки

| Файл | Описание |
|------|----------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Целевая архитектура проекта |
| [STEP_1_RESTRUCTURE.md](STEP_1_RESTRUCTURE.md) | Этап 1: Реструктуризация папок |
| [STEP_2_FRONTEND.md](STEP_2_FRONTEND.md) | Этап 2: Разбиение frontend |
| [STEP_3_WINDOWS_INSTALLER.md](STEP_3_WINDOWS_INSTALLER.md) | Этап 3: Windows установщик |
| [STEP_4_MACOS.md](STEP_4_MACOS.md) | Этап 4: macOS сборка |
| [AI_WORKFLOW.md](AI_WORKFLOW.md) | Гайд по работе с AI агентами в Cursor |
| [DELETED_FILES.md](DELETED_FILES.md) | Список удалённых файлов |

---

## Быстрый старт

### 1. Прочитай архитектуру
```
docs/migration/ARCHITECTURE.md
```

### 2. Начни с первого этапа
```
docs/migration/STEP_1_RESTRUCTURE.md
```

### 3. Используй AI эффективно
```
docs/migration/AI_WORKFLOW.md
```

---

## Порядок выполнения

```
ARCHITECTURE.md → STEP_1 → STEP_2 → STEP_3 → STEP_4
      ↑                                        
      └── AI_WORKFLOW.md (используй на каждом этапе)
```

---

## Рекомендуемые модели по этапам

| Этап | Рекомендуемые модели |
|------|---------------------|
| 1. Реструктуризация | Opus 4.5, Sonnet 4.5, Composer 1 |
| 2. Frontend | Sonnet 4.5, Sonnet 4, Gemini 3 Flash |
| 3. Windows installer | Opus 4.5, Sonnet 4.5, GPT-5.2 Codex |
| 4. macOS build | Opus 4.5, Sonnet 4.5, GPT-5.2 Codex |
| Тестирование | Sonnet 4, Gemini 3 Flash |

---

## Что уже сделано

- [x] Удалены дублирующиеся файлы (QtWebEngine, Native версии)
- [x] Обновлён requirements.txt
- [x] Созданы подробные инструкции
- [x] Написан гайд по работе с AI

## Что нужно сделать

- [ ] Этап 1: Создать новую структуру папок
- [ ] Этап 2: Разбить frontend на модули
- [ ] Этап 3: Создать Windows установщик
- [ ] Этап 4: Создать macOS сборку
- [ ] Тестирование на обеих платформах
