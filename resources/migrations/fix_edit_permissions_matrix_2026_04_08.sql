
-- Проверка чисел JOIN без INSERT: fix_edit_permissions_matrix_2026_04_08_verify_counts.sql
--
-- Без временных таблиц — чтобы SQL-валидаторы/линтеры не ругались на «table not found».
--
-- ON CONFLICT: повторный запуск / гонка / строка не удалена первым шагом — без ошибки 23505.

DELETE FROM artefact_source_roles AS asr
WHERE EXISTS (
  SELECT 1
  FROM artefacts AS a
  INNER JOIN (
    VALUES
      ('Дата решения 04'),
      ('Этап 05А'),
      ('Этап 07'),
      ('CustomModelId'),
      ('Эпик 09'),
      ('Дата решения для эпика 11'),
      ('Дата решения для эпика 12'),
      ('Дата (реализации) оперативного контроля'),
      ('Дата (реализации) аналитического контроля'),
      ('Дата (реализации) контроля модельных значений'),
      ('Дата (реализации) оценки влияния'),
      ('Эпик/фича для контроля модельных данных (07К)'),
      ('Количество объектов проверки'),
      ('Этап 04'),
      ('Модельный эпик 05'),
      ('Дата завершения разработки пилота'),
      ('Дата решения для 07 этапа'),
      ('Релиз'),
      ('Эпик 11'),
      ('Этап 12'),
      ('Дата релиза'),
      ('Эпик/фича Оперативного контроля'),
      ('Эпик/фича Аналитического контроля'),
      ('Эпик/фича для контроля модельных значений'),
      ('Эпик/фича для оценки влияния'),
      ('Контроль модельных данных (07К)'),
      ('Дата (реализации) контроля модельных данных'),
      ('Сегмент применения Модели / Рейтинговой системы / Алгоритма'),
      ('Реквизиты решения о выведении из эксплуатации'),
      ('Целевой сегмент Модели / Алгоритма'),
      ('Дата утверждения отчета валидации'),
      ('Подразделение разработки и вендор'),
      ('Отчет по разработке'),
      ('Модель входит в рейтинговую систему?'),
      ('Выходная таблица'),
      ('Параметры оценки аллокаций'),
      ('Название команды, ответственной за разработку'),
      ('Подсистема реализации модели'),
      ('Описание модели'),
      ('Класс оценки аллокаций'),
      ('Проект, в рамках которого реализуется задача по построению модели'),
      ('Команда, которая внедряла модель'),
      ('Бизнес-процесс'),
      ('Дата окончания разработки Модели'),
      ('Дата выведения Модели из ПИМ'),
      ('Дата начала разработки Модели'),
      ('Система внедрения')
  ) AS lf(artefact_label) ON lf.artefact_label = a.artefact_label
  INNER JOIN roles AS r ON r.role_name IN ('business_customer', 'ds_lead', 'validator_lead')
  CROSS JOIN (VALUES ('sum'::text), ('sum_rm'::text)) AS ts(model_source)
  WHERE asr.artefact_id = a.artefact_id
    AND asr.role_id = r.role_id
    AND asr.model_source = ts.model_source
);

INSERT INTO artefact_source_roles (artefact_id, model_source, role_id)
SELECT DISTINCT
  a.artefact_id,
  am.model_source,
  r.role_id
FROM (
  VALUES
    ('business_customer', 'sum_rm', 'Дата (реализации) оперативного контроля'),
    ('business_customer', 'sum_rm', 'Дата (реализации) аналитического контроля'),
    ('business_customer', 'sum_rm', 'Дата (реализации) контроля модельных значений'),
    ('business_customer', 'sum_rm', 'Дата (реализации) оценки влияния'),
    ('business_customer', 'sum_rm', 'Эпик/фича для контроля модельных данных (07К)'),
    ('business_customer', 'sum_rm', 'Количество объектов проверки'),
    ('business_customer', 'sum_rm', 'Эпик/фича Оперативного контроля'),
    ('business_customer', 'sum_rm', 'Эпик/фича Аналитического контроля'),
    ('business_customer', 'sum_rm', 'Эпик/фича для контроля модельных значений'),
    ('business_customer', 'sum_rm', 'Эпик/фича для оценки влияния'),
    ('business_customer', 'sum_rm', 'Контроль модельных данных (07К)'),
    ('business_customer', 'sum_rm', 'Дата (реализации) контроля модельных данных'),
    ('business_customer', 'sum', 'Сегмент применения Модели / Рейтинговой системы / Алгоритма'),
    ('business_customer', 'sum', 'Реквизиты решения о выведении из эксплуатации'),
    ('business_customer', 'sum', 'Дата (реализации) оперативного контроля'),
    ('business_customer', 'sum', 'Дата (реализации) аналитического контроля'),
    ('business_customer', 'sum', 'Дата (реализации) контроля модельных значений'),
    ('business_customer', 'sum', 'Дата (реализации) оценки влияния'),
    ('business_customer', 'sum', 'Эпик/фича для контроля модельных данных (07К)'),
    ('business_customer', 'sum', 'Количество объектов проверки'),
    ('business_customer', 'sum', 'Целевой сегмент Модели / Алгоритма'),
    ('business_customer', 'sum', 'Эпик/фича Оперативного контроля'),
    ('business_customer', 'sum', 'Эпик/фича Аналитического контроля'),
    ('business_customer', 'sum', 'Эпик/фича для контроля модельных значений'),
    ('business_customer', 'sum', 'Эпик/фича для оценки влияния'),
    ('business_customer', 'sum', 'Контроль модельных данных (07К)'),
    ('business_customer', 'sum', 'Дата (реализации) контроля модельных данных'),
    ('business_customer', 'sum', 'Подразделение разработки и вендор'),
    ('business_customer', 'sum', 'Отчет по разработке'),
    ('business_customer', 'sum', 'Модель входит в рейтинговую систему?'),
    ('business_customer', 'sum_rm', 'Подразделение разработки и вендор'),
    ('business_customer', 'sum_rm', 'Отчет по разработке'),
    ('business_customer', 'sum_rm', 'Модель входит в рейтинговую систему?'),
    ('validator_lead', 'sum', 'Сегмент применения Модели / Рейтинговой системы / Алгоритма'),
    ('validator_lead', 'sum', 'Реквизиты решения о выведении из эксплуатации'),
    ('validator_lead', 'sum', 'Целевой сегмент Модели / Алгоритма'),
    ('validator_lead', 'sum', 'Дата утверждения отчета валидации'),
    ('ds_lead', 'sum', 'Дата решения 04'),
    ('ds_lead', 'sum', 'Этап 05А'),
    ('ds_lead', 'sum', 'Этап 07'),
    ('ds_lead', 'sum', 'CustomModelId'),
    ('ds_lead', 'sum', 'Эпик 09'),
    ('ds_lead', 'sum', 'Дата решения для эпика 11'),
    ('ds_lead', 'sum', 'Выходная таблица'),
    ('ds_lead', 'sum', 'Параметры оценки аллокаций'),
    ('ds_lead', 'sum', 'Подсистема реализации модели'),
    ('ds_lead', 'sum', 'Дата окончания разработки Модели'),
    ('ds_lead', 'sum', 'Дата выведения Модели из ПИМ'),
    ('ds_lead', 'sum', 'Дата начала разработки Модели'),
    ('ds_lead', 'sum', 'Этап 04'),
    ('ds_lead', 'sum', 'Модельный эпик 05'),
    ('ds_lead', 'sum', 'Дата завершения разработки пилота'),
    ('ds_lead', 'sum', 'Дата решения для 07 этапа'),
    ('ds_lead', 'sum', 'Релиз'),
    ('ds_lead', 'sum', 'Эпик 11'),
    ('ds_lead', 'sum', 'Дата релиза'),
    ('ds_lead', 'sum', 'Класс оценки аллокаций'),
    ('ds_lead', 'sum', 'Команда, которая внедряла модель'),
    ('ds_lead', 'sum', 'Бизнес-процесс'),
    ('ds_lead', 'sum', 'Система внедрения')
) AS am(role_name, model_source, artefact_label)
JOIN artefacts AS a ON a.artefact_label = am.artefact_label
JOIN roles AS r ON r.role_name = am.role_name
ON CONFLICT (artefact_id, role_id, model_source) DO NOTHING;

-- ------------------------------------------------------------------
-- Hotfix: guarantee rm/sum-rm deny for business customer epic fields.
-- Context: some stands may keep stale rows with is_editable=1 for rm.
-- This block is idempotent and safe for repeated runs.
-- ------------------------------------------------------------------
WITH target_fields AS (
  SELECT unnest(
    ARRAY[
      'model_epic_04',
      'model_epic_04_date',
      'model_epic_05',
      'model_epic_05a',
      'model_epic_05_date',
      'model_epic_07',
      'model_epic_07_date',
      'release',
      'model_epic_09',
      'model_epic_11',
      'model_epic_11_date',
      'model_epic_12',
      'model_epic_12_date',
      'developing_end_date',
      'remove_date_validation',
      'date_of_introduction_into_operation',
      'data_completion_of_stage_05a',
      'customer_model_id'
    ]::text[]
  ) AS artefact_tech_label
),
target_roles AS (
  SELECT role_id
  FROM roles
  WHERE role_name IN ('business_customer', 'test_business_customer')
)
DELETE FROM artefact_source_roles AS asr
USING artefacts AS a, target_fields AS tf, target_roles AS tr
WHERE asr.artefact_id = a.artefact_id
  AND asr.role_id = tr.role_id
  AND a.artefact_tech_label = tf.artefact_tech_label
  AND asr.model_source IN ('sum_rm', 'sum-rm', 'rm');

-- ------------------------------------------------------------------
-- Post-check (run manually after migration):
-- Expected result: 0 rows for rm/sum-rm on the listed fields.
--
WITH target_fields AS (
  SELECT unnest(
    ARRAY[
      'model_epic_04',
      'model_epic_04_date',
      'model_epic_05',
      'model_epic_05a',
      'model_epic_05_date',
      'model_epic_07',
      'model_epic_07_date',
      'release',
      'model_epic_09',
      'model_epic_11',
      'model_epic_11_date',
      'model_epic_12',
      'model_epic_12_date',
      'developing_end_date',
      'remove_date_validation',
      'date_of_introduction_into_operation',
      'data_completion_of_stage_05a',
      'customer_model_id'
    ]::text[]
  ) AS artefact_tech_label
)
SELECT
  r.role_name,
  a.artefact_tech_label,
  asr.model_source
FROM artefact_source_roles AS asr
JOIN roles AS r ON r.role_id = asr.role_id
JOIN artefacts AS a ON a.artefact_id = asr.artefact_id
JOIN target_fields AS tf ON tf.artefact_tech_label = a.artefact_tech_label
WHERE r.role_name IN ('business_customer', 'test_business_customer')
  AND asr.model_source IN ('sum_rm', 'sum-rm', 'rm')
ORDER BY r.role_name, a.artefact_tech_label, asr.model_source;

-- ------------------------------------------------------------------
-- Final safeguard for stands where 3 fields can be reintroduced by
-- previous label-based rules. Keep this at the very end.
-- ------------------------------------------------------------------
DELETE FROM artefact_source_roles AS asr
WHERE asr.artefact_id IN (
  SELECT a.artefact_id
  FROM artefacts AS a
  WHERE a.artefact_tech_label IN (
    'customer_model_id',
    'data_completion_of_stage_05a',
    'date_of_introduction_into_operation'
  )
)
AND asr.role_id IN (
  SELECT r.role_id
  FROM roles AS r
  WHERE r.role_name IN ('business_customer', 'test_business_customer')
)
AND asr.model_source IN ('sum_rm', 'sum-rm', 'rm');
