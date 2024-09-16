const sql = `
WITH stalled_models AS (
    SELECT DISTINCT
        m_.model_id,
        EXTRACT(MONTH FROM m_.update_date) AS month,
        m_.update_date,
        DATE_PART('day', NOW() - m_.update_date) AS days_since_update
    FROM models_new m_
    JOIN artefact_realizations_new ar_ ON m_.model_id = ar_.model_id
    WHERE (
        $1::Date IS NULL
        OR (
            ar_.effective_from <= $2::Date
            AND (ar_.effective_to IS NULL OR ar_.effective_to >= $1::Date)
        )
    )
    AND (
        $3::VARCHAR[] IS NULL
        OR (ar_.artefact_id = 2074 AND ar_.artefact_string_value = ANY($3::VARCHAR[]))
    )
)
SELECT
    month,
    COUNT(*) AS stalled_models_count
FROM
    stalled_models
WHERE
    days_since_update > 5
GROUP BY
    month
ORDER BY
    month;
`;

export { sql };
