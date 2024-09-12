const updateModelName = `
UPDATE
    models
SET model_name = :model_name
WHERE model_id = :model_id
`;

export { updateModelName };
