const implementedModels = `
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
    WHERE a.artefact_tech_label IN ('date_of_introduction_into_operation', 'ds_stream')
)
SELECT m.model_id,
       ar1.artefact_string_value AS value,
       ar2.artefact_string_value AS stream
FROM models_new AS m
JOIN RankedArtefacts AS ar1
  ON m.model_id = ar1.model_id AND ar1.artefact_id = (SELECT artefact_id FROM artefacts WHERE artefact_tech_label = 'date_of_introduction_into_operation') AND ar1.rn = 1
LEFT JOIN RankedArtefacts AS ar2
  ON m.model_id = ar2.model_id AND ar2.artefact_id = (SELECT artefact_id FROM artefacts WHERE artefact_tech_label = 'ds_stream') AND ar2.rn = 1;
`;

export { implementedModels };
