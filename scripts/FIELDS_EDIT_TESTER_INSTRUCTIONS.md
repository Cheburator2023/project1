# Проверка редактируемости полей (для QA)

## Что есть

- `scripts/fields_edit_matrix_v2.py`
- `scripts/convert_surm_fields_edit_to_v2.py`
- `scripts/examples/surm_fields_edit_v2.generated.json` (уже сгенерирован из `surm_fields_edit.py`)

Опционально (если будут обновлять исходник):
- исходный файл `surm_fields_edit.py`

## Подготовка

1. Нужен `python3`.
2. Нужен JSON с артефактами из бека (эндпоинт `/artefacts`), сохраненный в файл.
   - Пример файла: `artefacts_response.json`
   - Формат: либо `{ "data": [...] }`, либо сразу массив `[...]`.

## Шаг 1. (Опционально) Перегенерировать matrix-json из исходного python-файла

```bash
python3 scripts/convert_surm_fields_edit_to_v2.py \
  --input-py "/path/to/surm_fields_edit.py" \
  --output-json "scripts/examples/surm_fields_edit_v2.generated.json"
```

## Шаг 2. Запустить проверку

```bash
python3 scripts/fields_edit_matrix_v2.py \
  --artefacts-json "/path/to/artefacts_response.json" \
  --matrix-json "scripts/examples/surm_fields_edit_v2.generated.json"
```

## Как читать результат

- `OK` — базовая ролево-источниковая редактируемость совпала.
- `MISMATCH` — ожидаемое значение не совпало с флагами из API.
- `actual=<NOT_FOUND>` — поле не найдено в `artefacts` (обычно проблема маппинга label/tech_label или поле отсутствует в выдаче).

## Важно

- Скрипт проверяет **базовые permission-флаги** (`is_edit_flg`, `is_editable_by_role_sum`, `is_editable_by_role_sum_rm`).
- Скрипт **не учитывает runtime-условия UI**:
  - `mode` add/edit,
  - `active_model`,
  - `valueConditions` / `enabledByValueConditions`,
  - block-list из процесса.

Поэтому расхождения между UI и скриптом нужно дополнительно проверять в форме (RightModalPanel).

