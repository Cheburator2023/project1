const tasks = `
WITH RankedArtefacts AS (
    SELECT
        ar.model_id,
        ar.functional_role,
        ar.effective_from,
        ar.effective_to,
        ROW_NUMBER() OVER (
            PARTITION BY ar.model_id, ar.functional_role
            ORDER BY ar.effective_to DESC
            ) as rn
    FROM
        assignee_hist AS ar
    WHERE
        (
        $1::Date IS NULL
        OR (
            ar.effective_from <= $2::Date
            AND (ar.effective_to IS NULL OR ar.effective_to >= $1::Date)
            )
        )
    )
    SELECT
        SUM(CASE WHEN t.functional_role IN ('validator', 'validator_lead') THEN 1 ELSE 0 END) AS validation_count,
        SUM(CASE WHEN t.functional_role IN ('ds', 'ds_lead') THEN 1 ELSE 0 END) AS datasource_count
    FROM
        (
            SELECT model_id, functional_role
            FROM RankedArtefacts
            WHERE rn = 1
        ) t
`;

export { tasks };
