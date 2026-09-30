// Правит usage_confirm ("Модель используется заказчиком") в MRM (models_usage +
// models_usage_history) для 2 моделей, у которых из-за бага дублирования usage при
// редактировании через форму (см. ModelsService.modelsUpdate, ветка isUsageArtefact)
// в реестре осталось устаревшее "Да", а в СУМ (актуально) уже "Нет".
//
// Значения ниже получены запросом к прод БД СУМ (models + model_usage_confirm) 30.09.2026:
//   5811094a-58de-11ef-bd9f-7289db359156 — root_model_id 11473, "Collection 61-90 General
//     для бинарного таргета (2023 год, ST_61_IP_AGR_BIN_BST_2407) для ипотечного сегмента RFD-4470", 2026 Q2
//   59eca34b-c22a-11ef-b539-924c8a1ad774 — root_model_id 13953, "Collection 31-60 General
//     для бинарного таргета (2023 год, ST_31_IP_AGR_BIN_BST_2411) для ипотечного сегмента RFD-4470", 2026 Q2
// creator/model_creator не критичны для логики приложения (не участвуют ни в одном
// бизнес-правиле) — заданы служебным значением "автор неизвестен".
// confirmation_date = 17.07.2026 — реальная дата подтверждения, уточнена аналитиком
// (совпадает у обеих моделей — один сегмент RFD-4470, подтверждались вместе).
// create_date модели (models_new) оставлен датой подготовки миграции — тоже не критично.

const usageBackfillPlanSql = `
CREATE TEMP TABLE usage_backfill_models_plan (
    model_id varchar(4000) PRIMARY KEY,
    root_model_id varchar(4000),
    model_name varchar(4000) NOT NULL,
    model_version varchar(4000),
    create_date timestamp,
    model_creator varchar(4000)
) ON COMMIT DROP;

INSERT INTO usage_backfill_models_plan (model_id, root_model_id, model_name, model_version, create_date, model_creator)
VALUES
    ('5811094a-58de-11ef-bd9f-7289db359156', '11473', 'Collection 61-90 General для бинарного таргета (2023 год, ST_61_IP_AGR_BIN_BST_2407) для ипотечного сегмента RFD-4470', '1', TIMESTAMP '2026-09-30 00:00:00', 'автор неизвестен'),
    ('59eca34b-c22a-11ef-b539-924c8a1ad774', '13953', 'Collection 31-60 General для бинарного таргета (2023 год, ST_31_IP_AGR_BIN_BST_2411) для ипотечного сегмента RFD-4470', '1', TIMESTAMP '2026-09-30 00:00:00', 'автор неизвестен');

CREATE TEMP TABLE usage_backfill_values_plan (
    model_id varchar(4000),
    confirmation_year integer,
    confirmation_quarter integer,
    confirmation_date date,
    is_used boolean,
    creator varchar(4000)
) ON COMMIT DROP;

-- Год/квартал — тот, что сейчас показывает "Да" в реестре; is_used=false, т.к. в СУМ уже "Нет".
INSERT INTO usage_backfill_values_plan (model_id, confirmation_year, confirmation_quarter, confirmation_date, is_used, creator)
VALUES
    ('5811094a-58de-11ef-bd9f-7289db359156', 2026, 2, DATE '2026-07-17', false, 'автор неизвестен'),
    ('59eca34b-c22a-11ef-b539-924c8a1ad774', 2026, 2, DATE '2026-07-17', false, 'автор неизвестен');

DO $guard$
DECLARE bad_row record;
BEGIN
    FOR bad_row IN
        SELECT model_id FROM usage_backfill_models_plan
         WHERE model_name LIKE '<FILL%' OR root_model_id LIKE '<FILL%' OR model_version LIKE '<FILL%' OR model_creator LIKE '<FILL%'
        UNION
        SELECT model_id FROM usage_backfill_values_plan WHERE creator LIKE '<FILL%'
    LOOP
        RAISE EXCEPTION USING ERRCODE = 'P2109',
            MESSAGE = format('019: план бэкфилла не заполнен реальными данными для модели %s', bad_row.model_id);
    END LOOP;
END
$guard$;
`

export const backfillUsageConfirmationDesyncInMrmSql = `
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';

${usageBackfillPlanSql}

-- Суррогат модели в реестре (models_new) — если на стенде его ещё нет. Если уже есть
-- (обычный случай для прода, где карточка в реестре и так отображается) — просто ничего не делает.
LOCK TABLE models_new IN SHARE ROW EXCLUSIVE MODE;
INSERT INTO models_new (root_model_id, model_id, model_name, model_version, create_date, update_date, model_creator)
SELECT p.root_model_id, p.model_id, p.model_name, p.model_version, p.create_date, p.create_date, p.model_creator
  FROM usage_backfill_models_plan p
ON CONFLICT (model_id) DO NOTHING;

-- Собственно правка: доводим models_usage до значения из СУМ. Если строки нет — создаём,
-- если есть, но не совпадает — обновляем; если уже совпадает (миграция уже отрабатывала
-- или значение и так верное) — WHERE в DO UPDATE не даёт строке попасть в RETURNING,
-- история повторно не пишется.
LOCK TABLE models_usage IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE models_usage_history IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE usage_backfill_applied ON COMMIT DROP AS
WITH upserted AS (
    INSERT INTO models_usage (model_id, confirmation_date, confirmation_year, confirmation_quarter, is_used, creator)
    SELECT model_id, confirmation_date, confirmation_year, confirmation_quarter, is_used, creator
      FROM usage_backfill_values_plan
    ON CONFLICT (model_id, confirmation_year, confirmation_quarter)
    DO UPDATE SET confirmation_date = EXCLUDED.confirmation_date,
                  is_used           = EXCLUDED.is_used
          WHERE models_usage.confirmation_date IS DISTINCT FROM EXCLUDED.confirmation_date
             OR models_usage.is_used           IS DISTINCT FROM EXCLUDED.is_used
    RETURNING usage_id, model_id, confirmation_date, is_used
)
SELECT * FROM upserted;

INSERT INTO models_usage_history (usage_id, model_id, confirmation_date, is_used, changed_by)
SELECT usage_id, model_id, confirmation_date, is_used, 'startup_migration_019_backfill'
  FROM usage_backfill_applied;

SELECT model_id, confirmation_date, is_used FROM usage_backfill_applied ORDER BY model_id;
`
