const sql = `
SELECT * FROM templates_new
WHERE template_id = :template_id
`;

export { sql };
