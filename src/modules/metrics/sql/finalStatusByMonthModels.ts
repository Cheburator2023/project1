const sql = `
WITH final_status_models AS (
    SELECT 
        DISTINCT m_.model_id,
        EXTRACT(MONTH FROM m_.create_date) AS month,
        ar_.artefact_string_value
    FROM models_new m_
    JOIN artefact_realizations_new ar_ ON m_.model_id = ar_.model_id
    WHERE 
        ar_.artefact_id IN (2081, 2101)
        AND ar_.artefact_string_value IN (
            'Внедряется', 
            'Внедрена в ПИМ', 
            'Внедрена вне ПИМ', 
            'Разработана, не внедрена', 
            'Модель не эффективна в БП заказчика', 
            'Вывод модели из эксплуатации'
        )
        AND (
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
    COUNT(*) AS final_status_by_month_count
FROM 
    final_status_models
GROUP BY 
    month
ORDER BY 
    month;
`;

export { sql };
