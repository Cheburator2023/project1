const sql = `
SELECT 
    SUM(CASE WHEN t.functional_role IN ('validator', 'validator_lead') THEN 1 ELSE 0 END) AS validation_count,
    SUM(CASE WHEN t.functional_role IN ('ds', 'ds_lead') THEN 1 ELSE 0 END) AS datasource_count
FROM 
    (
        SELECT DISTINCT model_id, functional_role
        FROM assignee_hist
        WHERE
            (
                :filter_date::Date IS NULL
                OR (effective_from <= :filter_date AND (effective_to IS NULL OR effective_to > :filter_date))
            )
    ) t;
`;

export { sql };
