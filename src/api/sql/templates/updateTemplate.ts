const sql = `
  UPDATE templates
  SET template_value = jsonb_concat(template_value, $1)
  WHERE template_id = $2;
`
export { sql };
