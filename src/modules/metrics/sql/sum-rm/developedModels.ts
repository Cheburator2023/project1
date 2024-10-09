const developedModels = `
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
    WHERE a.artefact_tech_label IN ('date_of_introduction_into_operation', 'developing_end_date', 'data_completion_of_stage_05a', 'ds_stream')
)
SELECT m.model_id,
       coalesce(ar2.artefact_string_value, ar3.artefact_string_value) AS value,
       ar4.artefact_string_value AS stream
FROM models_new AS m
LEFT JOIN RankedArtefacts AS ar1
  ON m.model_id = ar1.model_id AND ar1.artefact_id = (SELECT artefact_id FROM artefacts WHERE artefact_tech_label = 'date_of_introduction_into_operation') AND ar1.rn = 1
LEFT JOIN RankedArtefacts AS ar2
  ON m.model_id = ar2.model_id AND ar2.artefact_id = (SELECT artefact_id FROM artefacts WHERE artefact_tech_label = 'developing_end_date') AND ar2.rn = 1
LEFT JOIN RankedArtefacts AS ar3
  ON m.model_id = ar3.model_id AND ar3.artefact_id = (SELECT artefact_id FROM artefacts WHERE artefact_tech_label = 'data_completion_of_stage_05a') AND ar3.rn = 1
LEFT JOIN RankedArtefacts AS ar4
  ON m.model_id = ar4.model_id AND ar4.artefact_id = (SELECT artefact_id FROM artefacts WHERE artefact_tech_label = 'ds_stream') AND ar4.rn = 1
WHERE coalesce(ar2.artefact_string_value, ar3.artefact_string_value) IS NOT NULL
      AND ar1.artefact_string_value IS NULL;
`;

export { developedModels };
