const sql = `
DELETE
FROM templates_new
WHERE template_id = :template_id
`

export { sql }
