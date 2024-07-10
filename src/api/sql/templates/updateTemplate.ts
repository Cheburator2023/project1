const sql = `
WITH template_rows AS (
    UPDATE templates_new SET
        template_name = COALESCE(:template_name, template_name),
        public = COALESCE(:public, public),
        template_value = COALESCE(:template_value, template_value)
        WHERE template_id = :template_id
        RETURNING *
)
SELECT *
FROM template_rows
`
export { sql };
