const sql = `
SELECT
    ar_.artefact_id::numeric,
    a_.artefact_label,
    ar_.artefact_value_id,
    ar_.artefact_string_value,
    ar_.effective_from,
    ar_.creator
FROM
    artefact_realizations_new ar_
INNER JOIN
    artefacts a_
    ON
    ar_.artefact_id = a_.artefact_id
LEFT JOIN
    artefact_values av_
    ON
    ar_.artefact_value_id = av_.artefact_value_id
INNER JOIN
    artefact_x_type at_
    ON
    a_.artefact_type_id = at_.artefact_type_id
WHERE
    ar_.model_id = :model_id
AND
    a_.artefact_tech_label = :artefact_tech_label
ORDER BY
    ar_.artefact_id,
    av_.artefact_value_id
`

export { sql }
