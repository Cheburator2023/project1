// Источник: Таблица корректировок 21092026.xlsx, лист «Дата вывода модели».
// Строка 'null' из Excel означает SQL NULL в обоих полях значения.
type DecommissionRealizationsTable =
  | 'artefact_realizations'
  | 'artefact_realizations_new'

const buildClearModelDecommissionDateSql = (
  realizationsTable: DecommissionRealizationsTable
): string => `
CREATE TEMP TABLE artefact_cleanup_targets (
    model_id varchar(4000) NOT NULL,
    artefact_tech_label varchar(4000) NOT NULL,
    PRIMARY KEY (model_id, artefact_tech_label)
) ON COMMIT DROP;

INSERT INTO artefact_cleanup_targets (model_id, artefact_tech_label)
VALUES
    ('091d6c66-7093-11ed-a9f8-0a5801050287', 'rs_model_decommiss_date'),
    ('9eaa2ac9-0e87-11ee-8670-0a5801010376', 'rs_model_decommiss_date'),
    ('a60d849f-cc14-11ee-a34a-0a580107025e', 'rs_model_decommiss_date'),
    ('a8bfbb2b-cc0e-11ee-a34a-0a580107025e', 'rs_model_decommiss_date'),
    ('b5c8fa16-ce31-11ed-a97c-0a5801020269', 'rs_model_decommiss_date');

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

export const clearModelDecommissionDateInSumSql =
  buildClearModelDecommissionDateSql('artefact_realizations')

export const clearModelDecommissionDateInMrmSql =
  buildClearModelDecommissionDateSql('artefact_realizations_new')
