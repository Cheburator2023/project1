const isOnMonitoringModels = `
WITH RankedArtefacts AS (
    SELECT ar.model_id,
           ar.artefact_id,
           ar.artefact_string_value,
           ROW_NUMBER() OVER (
               PARTITION BY ar.model_id, ar.artefact_id
               ORDER BY ar.effective_from DESC
           ) AS rn
    FROM artefact_realizations AS ar
    JOIN artefacts AS a
      ON ar.artefact_id = a.artefact_id
    WHERE a.artefact_tech_label IN ('model_epic_12_date', 'Departament', 'automl_flg')
)
SELECT m.model_id,
       ar1.artefact_string_value AS value,
       ar2.artefact_string_value AS stream
FROM models AS m
JOIN RankedArtefacts AS ar1
  ON m.model_id = ar1.model_id AND ar1.artefact_id = (SELECT artefact_id FROM artefacts WHERE artefact_tech_label = 'model_epic_12_date') AND ar1.rn = 1
LEFT JOIN RankedArtefacts AS ar2
  ON m.model_id = ar2.model_id AND ar2.artefact_id = (SELECT artefact_id FROM artefacts WHERE artefact_tech_label = 'Departament') AND ar2.rn = 1
LEFT JOIN RankedArtefacts AS ar3
  ON m.model_id = ar3.model_id AND ar3.artefact_id = (SELECT artefact_id FROM artefacts WHERE artefact_tech_label = 'automl_flg' AND artefact_id = 310) AND ar3.rn = 1
WHERE (ar3.artefact_string_value IS NULL OR ar3.artefact_string_value != 'true');
`;

export { isOnMonitoringModels };