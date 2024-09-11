const updateModelUsage = `
INSERT INTO models_usage (model_id, confirmation_date, is_used)
VALUES (:model_id, :confirmation_date::Date, :is_used)
ON CONFLICT (model_id, confirmation_year, confirmation_quarter)
DO UPDATE SET
    confirmation_date = EXCLUDED.confirmation_date,
    is_used = EXCLUDED.is_used;
`

export { updateModelUsage }
