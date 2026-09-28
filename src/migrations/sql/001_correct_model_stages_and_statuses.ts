const correctModelStagesAndStatusesSql: string = `
-- Скрипт выполняется мигратором в одной транзакции.
-- При ошибке все изменения откатываются, а попытка считается обработанной навсегда.

CREATE TEMP TABLE stage_corrections (
    model_id varchar(36) NOT NULL,
    old_stage text NOT NULL,
    PRIMARY KEY (model_id, old_stage)
) ON COMMIT DROP;

INSERT INTO stage_corrections (model_id, old_stage)
VALUES
    ('2fdc2649-985a-11ef-b049-8215a604741b', 'Вывод модели из эксплуатации'),
    ('2fdc2649-985a-11ef-b049-8215a604741b', 'Инициализация'),
    ('7ba5df22-b0e5-11ec-bac6-0242ac11000d', 'Инициализация'),
    ('0fe12ac1-d82f-11ec-aca9-0a58010006b2', 'Инициализация'),
    ('1546f97b-d832-11ec-aca9-0a58010006b2', 'Инициализация'),
    ('2a3e7238-d833-11ec-aca9-0a58010006b2', 'Инициализация'),
    ('7102f024-613a-11ef-b31b-32eed338898a', 'Разработка промышленной витрины'),
    ('7102f024-613a-11ef-b31b-32eed338898a', 'Продуктивизация модели'),
    ('f8182e2f-a1c7-11eb-8c85-0242ac11000d', 'Инициализация'),
    ('1f7ab238-0b02-11f0-a52e-6648a57e7fa0', 'Инициализация');

-- Для этих двух моделей активная «Инициализация» находится в override,
-- а не в source. Обрабатываем их отдельно, не меняя source-историю.
CREATE TEMP TABLE stage_override_corrections (
    model_id varchar(36) NOT NULL,
    old_stage text NOT NULL,
    PRIMARY KEY (model_id, old_stage)
) ON COMMIT DROP;

INSERT INTO stage_override_corrections (model_id, old_stage)
VALUES
    ('cfb7243b-632d-11f1-8207-8eeb9414799e', 'Инициализация'),
    ('61b0feb7-6332-11f1-8207-8eeb9414799e', 'Инициализация');

CREATE TEMP TABLE status_corrections (
    model_id varchar(36) PRIMARY KEY,
    old_status text NOT NULL,
    new_status text NOT NULL
) ON COMMIT DROP;

INSERT INTO status_corrections (model_id, old_status, new_status)
VALUES
    ('2fdc2649-985a-11ef-b049-8215a604741b', 'В процессе разработки', 'Ошибка заведения'),
    ('247342fb-26a7-11ec-80d2-0242ac11000d', 'Разработана, не внедрена', 'Архив'),
    ('7c1f1d51-e425-11ed-870d-0a5801030275', 'Разработана, не внедрена', 'Внедрена вне ПИМ'),
    ('5294590c-cf71-11eb-8c85-0242ac11000d', 'Разработана, не внедрена', 'Архив'),
    ('1f7ab238-0b02-11f0-a52e-6648a57e7fa0', 'В процессе разработки', 'Ошибка заведения'),
    ('964e2733-c172-11ed-a9f8-0a5801050287', 'Разработана, не внедрена', 'Внедрена вне ПИМ');

-- В обработку попадают только корректировки, для которых найдена хотя бы одна
-- активная запись в целевой таблице. Отсутствующие записи будут пропущены с WARNING.
CREATE TEMP TABLE eligible_stage_corrections ON COMMIT DROP AS
SELECT c.model_id, c.old_stage
  FROM stage_corrections c
 WHERE EXISTS (
           SELECT 1
             FROM model_stage_source s
            WHERE s.model_id = c.model_id
              AND s.stage = c.old_stage
              AND s.effective_to = timestamp '9999-12-31 23:59:59'
       );

CREATE TEMP TABLE eligible_stage_override_corrections ON COMMIT DROP AS
SELECT c.model_id, c.old_stage
  FROM stage_override_corrections c
 WHERE EXISTS (
           SELECT 1
             FROM model_stage_override o
            WHERE o.model_id = c.model_id
              AND o.stage = c.old_stage
              AND o.effective_to = timestamp '9999-12-31 23:59:59'
       );

CREATE TEMP TABLE eligible_status_corrections ON COMMIT DROP AS
SELECT c.model_id, c.old_status, c.new_status
  FROM status_corrections c
 WHERE EXISTS (
           SELECT 1
             FROM model_status_source s
            WHERE s.model_id = c.model_id
              AND s.status = c.old_status
              AND s.effective_to = timestamp '9999-12-31 23:59:59'
       );

DO $$
DECLARE
    invalid_records text;
BEGIN
    SELECT string_agg(
               format('model_id=%s, stage=%L', c.model_id, c.old_stage),
               E'\n' ORDER BY c.model_id, c.old_stage)
      INTO invalid_records
      FROM stage_corrections c
     WHERE NOT EXISTS (
               SELECT 1
                 FROM eligible_stage_corrections e
                WHERE e.model_id = c.model_id
                  AND e.old_stage = c.old_stage
           );

    IF invalid_records IS NOT NULL THEN
        RAISE WARNING E'Не найдены активные этапы; эти корректировки будут пропущены:\n%', invalid_records;
    END IF;
END
$$;

DO $$
DECLARE
    invalid_records text;
BEGIN
    SELECT string_agg(
               format('model_id=%s, stage=%L', c.model_id, c.old_stage),
               E'\n' ORDER BY c.model_id, c.old_stage)
      INTO invalid_records
      FROM stage_override_corrections c
     WHERE NOT EXISTS (
               SELECT 1
                 FROM eligible_stage_override_corrections e
                WHERE e.model_id = c.model_id
                  AND e.old_stage = c.old_stage
           );

    IF invalid_records IS NOT NULL THEN
        RAISE WARNING E'Не найдены активные override-этапы; эти корректировки будут пропущены:\n%', invalid_records;
    END IF;
END
$$;

DO $$
DECLARE
    invalid_records text;
BEGIN
    SELECT string_agg(
               format('model_id=%s, status=%L', c.model_id, c.old_status),
               E'\n' ORDER BY c.model_id)
      INTO invalid_records
      FROM status_corrections c
     WHERE NOT EXISTS (
               SELECT 1
                 FROM eligible_status_corrections e
                WHERE e.model_id = c.model_id
                  AND e.old_status = c.old_status
           );

    IF invalid_records IS NOT NULL THEN
        RAISE WARNING E'Не найдены активные статусы; эти корректировки будут пропущены:\n%', invalid_records;
    END IF;
END
$$;

DO $$
DECLARE
    conflicting_overrides text;
BEGIN
    SELECT string_agg(
               format('model_id=%s, status=%L', o.model_id, o.status),
               E'\n' ORDER BY o.model_id, o.id)
      INTO conflicting_overrides
      FROM model_status_override o
      JOIN eligible_status_corrections c ON c.model_id = o.model_id
     WHERE o.effective_to = timestamp '9999-12-31 23:59:59';

    IF conflicting_overrides IS NOT NULL THEN
        RAISE EXCEPTION E'Найдены активные корректировки статуса; безопасное применение невозможно:\n%', conflicting_overrides;
    END IF;
END
$$;

CREATE TEMP TABLE correction_context (
    effective_at timestamp NOT NULL
) ON COMMIT DROP;

INSERT INTO correction_context (effective_at)
VALUES (now()::timestamp);

UPDATE model_stage_source s
   SET effective_to = ctx.effective_at
  FROM eligible_stage_corrections c
 CROSS JOIN correction_context ctx
 WHERE s.model_id = c.model_id
   AND s.stage = c.old_stage
   AND s.effective_to = timestamp '9999-12-31 23:59:59';

UPDATE model_stage_override o
   SET effective_to = ctx.effective_at,
       updated_at = current_timestamp
  FROM eligible_stage_override_corrections c
 CROSS JOIN correction_context ctx
 WHERE o.model_id = c.model_id
   AND o.stage = c.old_stage
   AND o.effective_to = timestamp '9999-12-31 23:59:59';

UPDATE model_status_source s
   SET effective_to = ctx.effective_at
  FROM eligible_status_corrections c
 CROSS JOIN correction_context ctx
 WHERE s.model_id = c.model_id
   AND s.status = c.old_status
   AND s.effective_to = timestamp '9999-12-31 23:59:59';

INSERT INTO model_status_override (
    model_id, source_record_id, status, effective_from, effective_to,
    correction_reason, is_final_override, author, created_at, updated_at
)
SELECT c.model_id, NULL, c.new_status, ctx.effective_at,
       timestamp '9999-12-31 23:59:59',
       'Ручное изменение', false, 'initial load',
       current_timestamp, current_timestamp
  FROM eligible_status_corrections c
 CROSS JOIN correction_context ctx;

-- Повторный enqueue не сбрасывает attempts. Без явного сброса модель,
-- ранее исчерпавшая лимит worker, не попадёт в повторный пересчёт.
UPDATE model_recalc_queue q
   SET attempts = 0
 WHERE q.model_id IN (
           SELECT model_id FROM eligible_stage_corrections
           UNION
           SELECT model_id FROM eligible_stage_override_corrections
           UNION
           SELECT model_id FROM eligible_status_corrections
       );
`

export { correctModelStagesAndStatusesSql }
