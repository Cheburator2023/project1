const updateModelUpdateDate = `
UPDATE
    models
SET update_date = :update_date
WHERE model_id = :model_id
`

export { updateModelUpdateDate }
