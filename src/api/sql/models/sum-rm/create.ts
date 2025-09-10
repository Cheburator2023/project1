const sql = `
INSERT INTO models_new
(root_model_id,
 model_id,
 model_name,
 model_version,
 create_date,
 update_date,
 model_creator)
VALUES (nextval('models_seq'),
        :model_id,
        :model_name,
        :model_version,
        :create_date,
        :update_date,
        :model_creator)
RETURNING *;
`

export { sql }
