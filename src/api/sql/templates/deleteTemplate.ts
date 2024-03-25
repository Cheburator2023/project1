const sql = `
  DELETE
    FROM templates
        WHERE template_id = $1
`

export { sql };
