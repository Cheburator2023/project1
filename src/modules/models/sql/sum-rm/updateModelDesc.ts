const updateModelDesc = `
UPDATE
    models_new
SET model_desc = :model_desc
WHERE model_id = :model_id
`;

export { updateModelDesc };
