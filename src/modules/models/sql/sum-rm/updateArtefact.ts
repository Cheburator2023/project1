const updateArtefact = `
WITH cte as (
    SELECT DISTINCT :model_id                    as model_id,
                    artefact_id                  as artefact_id,
                    :artefact_value_id::numeric  as artefact_value_id,
                    :artefact_string_value::text as artefact_string_value
    FROM artefacts
    WHERE artefact_tech_label = :artefact_tech_label
),
     upsert AS (
         UPDATE artefact_realizations_new as ar_re
             SET
                 artefact_value_id = cte.artefact_value_id,
                 artefact_string_value = cte.artefact_string_value
             FROM cte
             WHERE ar_re.artefact_id = cte.artefact_id
                 AND ar_re.model_id = cte.model_id
                 AND ar_re.artefact_value_id = cte.artefact_value_id
             RETURNING ar_re.artefact_id, ar_re.model_id
     )
INSERT
INTO artefact_realizations_new (artefact_id, model_id, artefact_value_id, artefact_string_value)
SELECT artefact_id, model_id, artefact_value_id, artefact_string_value
from cte
WHERE NOT EXISTS(
        SELECT * FROM upsert
    )
`

export { updateArtefact }
