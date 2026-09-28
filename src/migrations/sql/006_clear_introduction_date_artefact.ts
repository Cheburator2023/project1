type ArtefactRealizationsTable =
  | 'artefact_realizations'
  | 'artefact_realizations_new'

const buildClearIntroductionDateArtefactSql = (
  realizationsTable: ArtefactRealizationsTable
): string => `
CREATE TEMP TABLE artefact_cleanup_targets (
    model_id varchar(4000) PRIMARY KEY
) ON COMMIT DROP;

INSERT INTO artefact_cleanup_targets (model_id)
VALUES
    ('27f70978-0e57-11f0-a52e-6648a57e7fa0'),
    ('ee4a12ee-7145-11f1-bb42-de19930c7197');

DO $$
DECLARE
    artefact_count integer;
BEGIN
    SELECT count(*)
      INTO artefact_count
      FROM artefacts
     WHERE artefact_tech_label = 'date_of_introduction_into_operation';

    IF artefact_count <> 1 THEN
        RAISE EXCEPTION 'Ожидался ровно один артефакт с tech label date_of_introduction_into_operation, найдено: %', artefact_count;
    END IF;
END
$$;

CREATE TEMP TABLE resolved_artefact_cleanup_targets ON COMMIT DROP AS
SELECT target.model_id,
       artefact.artefact_id
  FROM artefact_cleanup_targets target
 CROSS JOIN artefacts artefact
 WHERE artefact.artefact_tech_label = 'date_of_introduction_into_operation';

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

const clearIntroductionDateArtefactInSumSql =
  buildClearIntroductionDateArtefactSql('artefact_realizations')

const clearIntroductionDateArtefactInMrmSql =
  buildClearIntroductionDateArtefactSql('artefact_realizations_new')

export {
  clearIntroductionDateArtefactInMrmSql,
  clearIntroductionDateArtefactInSumSql
}
