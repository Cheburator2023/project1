const tasks = `
WITH RankedArtefacts AS (
    SELECT
        ah.model_id,
        ah.functional_role,
        ah.effective_from,
        ah.effective_to,
        ROW_NUMBER() OVER (
            PARTITION BY ah.model_id, ah.functional_role
            ORDER BY ah.effective_to DESC
        ) as rn
    FROM assignee_hist AS ah
    WHERE (
        $1::Date IS NULL
        OR (
            ah.effective_from <= $2::Date
            AND (ah.effective_to IS NULL OR ah.effective_to >= $1::Date)
        )
    )
), departament AS (
    SELECT 
    	ar.model_id, 
    	ar.artefact_string_value,
    	ROW_NUMBER() OVER (
            PARTITION BY ar.model_id, ar.artefact_id
            ORDER BY ar.effective_from DESC
        ) as rn
    FROM artefact_realizations ar
    JOIN artefacts a ON ar.artefact_id = a.artefact_id
    WHERE a.artefact_tech_label = 'Departament'
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
LEFT JOIN departament d ON d.model_id = t.model_id AND d.rn = 1
WHERE $3::VARCHAR[] IS NULL
    OR d.artefact_string_value = ANY($3::VARCHAR[])
`;

export { tasks };
