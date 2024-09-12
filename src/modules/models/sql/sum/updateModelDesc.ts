const updateModelDesc = `
UPDATE
    models
SET model_desc = :model_desc
WHERE model_id = :model_id
`;

export { updateModelDesc };
