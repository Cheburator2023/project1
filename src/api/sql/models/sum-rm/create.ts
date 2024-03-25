const sql = `
INSERT INTO models_new
(root_model_id,
 model_id,
 model_name,
 model_desc,
 model_version)
VALUES (nextval('models_seq'),
        :model_id,
        :model_name,
        :model_desc,
        :model_version)
`;

export { sql };
