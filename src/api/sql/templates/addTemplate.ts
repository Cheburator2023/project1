const sql = `
WITH template_rows AS (
    INSERT INTO templates_new (user_id, template_name, public, template_value)
    VALUES (:user_id, :template_name, :public, :template_value)
    RETURNING *
)
SELECT * FROM template_rows
`;

export { sql };
