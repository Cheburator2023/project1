const getModels = `
WITH RankedArtefacts AS (
    SELECT ar.model_id,
           ar.artefact_id,
           ar.artefact_string_value,
           ROW_NUMBER() OVER (
               PARTITION BY ar.model_id, ar.artefact_id
               ORDER BY ar.effective_from DESC
           ) AS rn
    FROM artefact_realizations_new AS ar
    JOIN artefacts AS a
      ON ar.artefact_id = a.artefact_id
    WHERE a.artefact_tech_label IN ('rs_model_decommiss_date', 'date_of_introduction_into_operation', 'model_epic_05_date', 'data_completion_of_stage_05a', 'Departament')
)
SELECT m.model_id,
       coalesce(
         ar1.artefact_string_value,
         ar2.artefact_string_value,
         ar3.artefact_string_value,
         ar4.artefact_string_value,
         to_char(m.create_date, 'YYYY-MM-DD')
       ) AS value,
       ar5.artefact_string_value AS stream
FROM models_new AS m
LEFT JOIN RankedArtefacts AS ar1
  ON m.model_id = ar1.model_id AND ar1.artefact_id = (SELECT artefact_id FROM artefacts WHERE artefact_tech_label = 'rs_model_decommiss_date') AND ar1.rn = 1
LEFT JOIN RankedArtefacts AS ar2
  ON m.model_id = ar2.model_id AND ar2.artefact_id = (SELECT artefact_id FROM artefacts WHERE artefact_tech_label = 'date_of_introduction_into_operation') AND ar2.rn = 1
LEFT JOIN RankedArtefacts AS ar3
  ON m.model_id = ar3.model_id AND ar3.artefact_id = (SELECT artefact_id FROM artefacts WHERE artefact_tech_label = 'model_epic_05_date') AND ar3.rn = 1
LEFT JOIN RankedArtefacts AS ar4
  ON m.model_id = ar4.model_id AND ar4.artefact_id = (SELECT artefact_id FROM artefacts WHERE artefact_tech_label = 'data_completion_of_stage_05a') AND ar4.rn = 1
LEFT JOIN RankedArtefacts AS ar5
  ON m.model_id = ar5.model_id AND ar5.artefact_id = (SELECT artefact_id FROM artefacts WHERE artefact_tech_label = 'Departament') AND ar5.rn = 1
WHERE coalesce(
    ar1.artefact_string_value,
    ar2.artefact_string_value,
    ar3.artefact_string_value,
    ar4.artefact_string_value,
    to_char(m.create_date, 'YYYY-MM-DD')
) IS NOT NULL
`;

export { getModels };
