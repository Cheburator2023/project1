// Очистка согласованных атрибутов 04 в СУМ и СУМ-РМ с сохранением истории.
type Epic04RealizationsTable =
  | 'artefact_realizations'
  | 'artefact_realizations_new'

const buildClearEpic04ArtefactsSql = (
  realizationsTable: Epic04RealizationsTable
): string => `
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
LOCK TABLE ${realizationsTable} IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE artefacts IN SHARE MODE;
CREATE TEMP TABLE artefact_cleanup_targets (
    model_id varchar(4000) NOT NULL,
    artefact_tech_label varchar(4000) NOT NULL,
    PRIMARY KEY (model_id, artefact_tech_label)
) ON COMMIT DROP;

INSERT INTO artefact_cleanup_targets (model_id, artefact_tech_label)
VALUES
    ('e0c97ff6-efbb-11f0-98ea-f228069a5ba8', 'model_epic_04'),
    ('e0c97ff6-efbb-11f0-98ea-f228069a5ba8', 'model_epic_04_date'),
    ('46c9dc1e-38bb-11f1-a2da-c20397ff4bcf', 'model_epic_04_date');

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

export const clearEpic04Artefacts08102026InSumSql =
  buildClearEpic04ArtefactsSql('artefact_realizations')

export const clearEpic04Artefacts08102026InMrmSql =
  buildClearEpic04ArtefactsSql('artefact_realizations_new')
