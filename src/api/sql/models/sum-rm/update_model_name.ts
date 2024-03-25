const sql = `
UPDATE
    models_new
SET model_name = :model_name
WHERE model_id = :model_id
`;

export { sql };
