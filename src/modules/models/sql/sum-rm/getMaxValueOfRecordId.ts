const getMaxValueOfRecordId = `
SELECT MAX(
    COALESCE(
        CASE
            WHEN artefact_string_value ~ '^[0-9]+$' THEN artefact_string_value::Numeric
            ELSE 0
            END,
        0
    )
) AS max_value
FROM artefact_realizations_new
    INNER JOIN artefacts a ON artefact_realizations_new.artefact_id = a.artefact_id
WHERE artefact_tech_label = 'record_id';
`

export { getMaxValueOfRecordId }
