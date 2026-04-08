-- Проверка матрицы БЕЗ изменения данных.
-- DBeaver: схема mrms — выполнить весь файл (Ctrl+Enter «скриптом» или выделить всё и Execute).
SET search_path TO mrms, public;

WITH am(role_name, model_source, artefact_label) AS (
  SELECT * FROM (VALUES
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
  ) AS v(role_name, model_source, artefact_label)
),
j AS (
  SELECT a.artefact_id, am.model_source, r.role_id
  FROM am
  INNER JOIN artefacts AS a ON a.artefact_label = am.artefact_label
  INNER JOIN roles AS r ON r.role_name = am.role_name
)
SELECT
  (SELECT COUNT(*) FROM am) AS rows_in_matrix,
  (SELECT COUNT(*) FROM am INNER JOIN artefacts a ON a.artefact_label = am.artefact_label) AS after_artefacts,
  (SELECT COUNT(*) FROM j) AS after_roles_join,
  (SELECT COUNT(*) FROM (SELECT DISTINCT artefact_id, model_source, role_id FROM j) d) AS distinct_pk;
