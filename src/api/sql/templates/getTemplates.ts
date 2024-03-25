const sql = `
  SELECT t_.*,
         tg_.group_label
  FROM templates t_
           INNER JOIN template_groups tg_ ON t_.group_id = tg_.group_id
`;

export { sql };
