// Источник: Исправление Названии модели.xlsx, Лист1!A2:B7.
// Транзакциями отдельно для СУМ и СУМ-РМ управляет StartupSqlMigrationService.
const modelNameTargetsSql = `
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';

CREATE TEMP TABLE model_name_correction_targets (
    model_id varchar(4000) PRIMARY KEY,
    model_name varchar(4000) NOT NULL
) ON COMMIT DROP;

INSERT INTO model_name_correction_targets (model_id, model_name)
VALUES
    ('85bf6530-1038-11ee-8670-0a5801010376', 'Модель сдвигов одновалютных базисных спредов КС ЦБ РФ (Архив)'),
    ('0102aee8-d962-11ef-b539-924c8a1ad774', 'Модель сдвигов одновалютных базисных спредов КС ЦБ РФ (Ошибка заведения)'),
    ('d72bac14-8155-11ed-a9f8-0a5801050287', 'CRM. Модели look-alike по mcc-кодам транзакций в категории "Электроника" в следующем месяце'),
    ('bf256f2b-8158-11ed-a9f8-0a5801050287', 'CRM. Модели look-alike по mcc-кодам транзакций в категории "Интернет-магазины" в следующем месяце'),
    ('4460c2cc-29fd-11ed-b6c0-0a58010205b6', 'Модель отклика+одобрения по продукту PACC. Версия 2022 года'),
    ('d3f5dca5-9d28-11eb-8c85-0242ac11000d', 'Модель отклика+одобрения по продукту PACC. Версия 2021 года');
`

const buildModelNameUpdateSql = (table: 'models' | 'models_new'): string => `
-- На стенде могут отсутствовать отдельные модели. Их пропускаем с предупреждением.
DO $$
DECLARE
    missing_model record;
BEGIN
    FOR missing_model IN
        SELECT target.model_id
          FROM model_name_correction_targets target
         WHERE NOT EXISTS (SELECT 1 FROM ${table} model WHERE model.model_id = target.model_id)
    LOOP
        RAISE WARNING '013: модель % отсутствует в ${table}, пропущена', missing_model.model_id;
    END LOOP;
END
$$;

-- RETURNING фиксирует точный набор обновлённых моделей для истории артефакта.
CREATE TEMP TABLE updated_model_name_targets ON COMMIT DROP AS
WITH updated AS (
    UPDATE ${table} model
       SET model_name = target.model_name
      FROM model_name_correction_targets target
     WHERE model.model_id = target.model_id
    RETURNING model.model_id, model.model_name
)
SELECT model_id, model_name FROM updated;
`

export const correctModelNamesInSumSql = `
${modelNameTargetsSql}
${buildModelNameUpdateSql('models')}
`

export const correctModelNamesInMrmSql = `
${modelNameTargetsSql}
-- Не допускаем параллельную запись истории между закрытием и вставкой.
LOCK TABLE artefact_realizations_new IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE artefacts IN SHARE MODE;

DO $$
DECLARE
    artefact_count integer;
BEGIN
    SELECT count(*) INTO artefact_count
      FROM artefacts
     WHERE artefact_tech_label = 'model_name_dadm';
    IF artefact_count <> 1 THEN
        RAISE EXCEPTION 'Ожидался ровно один артефакт model_name_dadm, найдено: %', artefact_count;
    END IF;
END
$$;

${buildModelNameUpdateSql('models_new')}

CREATE TEMP TABLE resolved_model_name_targets ON COMMIT DROP AS
SELECT target.model_id, target.model_name, artefact.artefact_id
  FROM updated_model_name_targets target
 CROSS JOIN artefacts artefact
 WHERE artefact.artefact_tech_label = 'model_name_dadm';

UPDATE artefact_realizations_new realization
   SET effective_to = now()
  FROM resolved_model_name_targets target
 WHERE realization.model_id = target.model_id
   AND realization.artefact_id = target.artefact_id
   AND realization.effective_to = timestamp '9999-12-31 23:59:59';

INSERT INTO artefact_realizations_new (
    artefact_id, model_id, artefact_value_id, artefact_string_value,
    effective_from, effective_to
)
SELECT artefact_id, model_id, NULL, model_name,
       now(), timestamp '9999-12-31 23:59:59'
  FROM resolved_model_name_targets;
`
