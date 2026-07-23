const sql = `
SELECT hs.history_source
FROM artefact_history_source hs
INNER JOIN artefacts a ON a.artefact_id = hs.artefact_id
WHERE a.artefact_tech_label = :artefact_tech_label
  AND hs.model_source = :model_source
`

export { sql }
