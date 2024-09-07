const sql = `
SELECT COUNT(DISTINCT m_.model_id) AS final_status_models_count
FROM models_new m_
JOIN artefact_realizations_new ar_ ON m_.model_id = ar_.model_id
WHERE ar_.artefact_id IN (2081, 2101)
  AND (
      ar_.artefact_string_value IN (
          'Внедряется', 
          'Внедрена в ПИМ', 
          'Внедрена вне ПИМ', 
          'Разработана, не внедрена', 
          'Модель не эффективна в БП заказчика', 
          'Вывод модели из эксплуатации'
      )
  )
  AND (
      $1::Date IS NULL
      OR (ar_.effective_from <= $1 AND (ar_.effective_to IS NULL OR ar_.effective_to > $1))
  )
  AND (
      $2::VARCHAR IS NULL
      OR (ar_.artefact_id = 2074 AND ar_.artefact_string_value = $2::VARCHAR)
  );
`;

export { sql };
