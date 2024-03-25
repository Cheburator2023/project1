const sql = `
  INSERT INTO templates (user_id, group_id, template_label, template_value)
  VALUES ($1, $2, $3, $4);
`;

export { sql };
