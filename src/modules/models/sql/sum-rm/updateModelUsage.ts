const updateModelUsage = `
WITH upsert AS (
    INSERT INTO models_usage (model_id, confirmation_date, is_used)
        VALUES (:model_id, TO_DATE(:confirmation_date, 'DD.MM.YYYY'), :is_used)
        ON CONFLICT (model_id, confirmation_year, confirmation_quarter)
            DO UPDATE SET
                confirmation_date = EXCLUDED.confirmation_date,
                is_used = EXCLUDED.is_used
        RETURNING usage_id, model_id, confirmation_date, is_used
)
INSERT
INTO models_usage_history (usage_id, model_id, confirmation_date, is_used, changed_by)
SELECT *,
       'admin' AS changed_by
FROM upsert
`

export { updateModelUsage }
