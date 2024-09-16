const developedModels = `
SELECT COUNT(DISTINCT m_.model_id) AS developed_models_count
FROM models_new m_
JOIN artefact_realizations_new ar_ ON m_.model_id = ar_.model_id
WHERE ar_.artefact_id IN (2081, 2101)
  AND (
      ar_.artefact_string_value = 'Не внедряется' 
      OR ar_.artefact_string_value = 'Разработана, не внедрена'
  )
  AND (
      $1::Date IS NULL
      OR (
          ar_.effective_from <= $2::Date
          AND (ar_.effective_to IS NULL OR ar_.effective_to >= $1::Date)
      )
  )
  AND (
      $3::VARCHAR[] IS NULL
      OR (ar_.artefact_id = 2074 AND ar_.artefact_string_value = ANY($3::VARCHAR[]))
  );
`;

export { developedModels };
