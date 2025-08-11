const getArtefactTimestamps = `
SELECT 
    model_id,
    artefact_id,
    artefact_string_value,
    effective_from
FROM artefact_realizations
WHERE effective_to = TO_TIMESTAMP('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
AND artefact_id = ANY(:artefact_ids::numeric[])
AND (
    :filter_date::Date IS NULL
    OR TO_DATE(CAST(:filter_date AS Varchar(4000)), 'YYYY-MM-DD')
        BETWEEN DATE_TRUNC('day', effective_from)::Date AND DATE_TRUNC('day', effective_to)::Date
)
ORDER BY model_id, artefact_id, effective_from DESC
`;

export { getArtefactTimestamps };
