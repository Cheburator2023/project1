const sql = `
SELECT *
FROM templates_new
WHERE LOWER(template_name) = LOWER(:template_name)
`

export { sql }
