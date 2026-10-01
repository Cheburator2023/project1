// Исправление 017. Саму 017 не меняем: журнал блокирует повтор любой попытки.
// СУМ: все 7 исправлений с правильным tech label.
// СУМ-РМ: восстановление ошибочно очищенного атрибута и очистка правильного.
type ClosureRepairTable = 'artefact_realizations' | 'artefact_realizations_new'

const introductionDateTargetSql = `
    ('f16ce4c5-971b-11ed-a9f8-0a5801050287', 'date_of_introduction_into_operation')
`

const allSumTargetsSql = `
    ('f16ce4c5-971b-11ed-a9f8-0a5801050287', 'date_of_introduction_into_operation'),
    ('3d384897-a0dd-11ef-b049-8215a604741b', 'model_epic_04'),
    ('3d384897-a0dd-11ef-b049-8215a604741b', 'model_epic_04_date'),
    ('57cde43c-1ede-11f1-bc51-0a9519d8edb5', 'model_epic_04'),
    ('57cde43c-1ede-11f1-bc51-0a9519d8edb5', 'model_epic_04_date'),
    ('27f70978-0e57-11f0-a52e-6648a57e7fa0', 'model_epic_12'),
    ('27f70978-0e57-11f0-a52e-6648a57e7fa0', 'model_epic_12_date')
`

const buildCorrectClosureArtefactsSql = (
  realizationsTable: ClosureRepairTable,
  targetsSql: string
): string => `
CREATE TEMP TABLE artefact_cleanup_targets (
    model_id varchar(4000) NOT NULL,
    artefact_tech_label varchar(4000) NOT NULL,
    PRIMARY KEY (model_id, artefact_tech_label)
) ON COMMIT DROP;

INSERT INTO artefact_cleanup_targets (model_id, artefact_tech_label)
VALUES
${targetsSql};

DO $$
DECLARE
    invalid_artefacts text;
BEGIN
    SELECT string_agg(
               format('tech_label=%L, count=%s', checked.artefact_tech_label, checked.artefact_count),
               E'\n' ORDER BY checked.artefact_tech_label
           )
      INTO invalid_artefacts
      FROM (
          SELECT target.artefact_tech_label,
                 count(artefact.artefact_id) AS artefact_count
            FROM (
                SELECT DISTINCT artefact_tech_label
                  FROM artefact_cleanup_targets
            ) target
            LEFT JOIN artefacts artefact
              ON artefact.artefact_tech_label = target.artefact_tech_label
           GROUP BY target.artefact_tech_label
          HAVING count(artefact.artefact_id) <> 1
      ) checked;

    IF invalid_artefacts IS NOT NULL THEN
        RAISE EXCEPTION E'Ожидался ровно один артефакт для каждого tech label:\n%', invalid_artefacts;
    END IF;
END
$$;

CREATE TEMP TABLE resolved_artefact_cleanup_targets ON COMMIT DROP AS
SELECT target.model_id,
       artefact.artefact_id
  FROM artefact_cleanup_targets target
  JOIN artefacts artefact
    ON artefact.artefact_tech_label = target.artefact_tech_label;

UPDATE ${realizationsTable} realization
   SET effective_to = current_timestamp(0)
  FROM resolved_artefact_cleanup_targets target
 WHERE realization.model_id = target.model_id
   AND realization.artefact_id = target.artefact_id
   AND realization.effective_to = timestamp '9999-12-31 23:59:59';

INSERT INTO ${realizationsTable} (
    artefact_id,
    model_id,
    artefact_value_id,
    artefact_string_value,
    effective_from,
    effective_to
)
SELECT
    artefact_id,
    model_id,
    NULL,
    NULL,
    current_timestamp(0),
    timestamp '9999-12-31 23:59:59'
  FROM resolved_artefact_cleanup_targets;
`

export const repairRequestClosureArtefactsInSumSql = `
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
LOCK TABLE artefact_realizations IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE artefacts IN SHARE MODE;
${buildCorrectClosureArtefactsSql('artefact_realizations', allSumTargetsSql)}
`

export const repairRequestClosureArtefactsInMrmSql = `
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
LOCK TABLE artefact_realizations_new IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE artefacts IN SHARE MODE;

DO $repair$
DECLARE
    target_model constant text := 'f16ce4c5-971b-11ed-a9f8-0a5801050287';
    target_artefact integer;
    artefact_count integer;
    latest_from timestamp;
    latest_count integer;
BEGIN
    SELECT count(*), min(artefact_id)
      INTO artefact_count, target_artefact
      FROM artefacts
     WHERE artefact_tech_label = 'date_of_it_introduction_into_operation';
    IF artefact_count <> 1 THEN
        RAISE EXCEPTION '019: ожидался один date_of_it_introduction_into_operation, найдено %', artefact_count;
    END IF;

    -- Выбираем последнюю запись, которая останется после удаления всех NULL.
    SELECT max(effective_from) INTO latest_from
      FROM artefact_realizations_new
     WHERE model_id = target_model
       AND artefact_id = target_artefact
       AND artefact_string_value IS NOT NULL;
    IF latest_from IS NULL THEN
        RAISE EXCEPTION '019: нет записи с непустым SQL-значением и effective_from для восстановления модели %', target_model;
    END IF;

    SELECT count(*) INTO latest_count
      FROM artefact_realizations_new
     WHERE model_id = target_model
       AND artefact_id = target_artefact
       AND artefact_string_value IS NOT NULL
       AND effective_from = latest_from;
    IF latest_count <> 1 THEN
        RAISE EXCEPTION '019: дата % соответствует % записям, восстановление неоднозначно', latest_from, latest_count;
    END IF;

    -- Правило пользователя: удалить ВСЕ SQL NULL только у ошибочного атрибута
    -- указанной модели, включая исторические NULL. Строка 'null' не удаляется.
    DELETE FROM artefact_realizations_new
     WHERE model_id = target_model
       AND artefact_id = target_artefact
       AND artefact_string_value IS NULL;

    UPDATE artefact_realizations_new
       SET effective_to = timestamp '9999-12-31 23:59:59'
     WHERE model_id = target_model
       AND artefact_id = target_artefact
       AND artefact_string_value IS NOT NULL
       AND effective_from = latest_from;
END;
$repair$;

-- Выполняется в той же транзакции: ошибка очистки откатывает и восстановление.
-- Эпики 04/12 в СУМ-РМ уже исправлены миграцией 017 и здесь не затрагиваются.
${buildCorrectClosureArtefactsSql('artefact_realizations_new', introductionDateTargetSql)}
`
