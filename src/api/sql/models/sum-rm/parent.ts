const sql = `
SELECT t1.*,
       t2.model_version as parent_model_version
FROM models_new t1
         INNER JOIN
     models_new t2
     ON
         t1.root_model_id = t2.root_model_id
WHERE t1.model_id = :parent_model_id
ORDER BY t2.model_version
`;

export { sql };
