const sql = `
SELECT c.cutover_at
FROM artefact_sync_cutover c
INNER JOIN artefacts a ON a.artefact_id = c.artefact_id
WHERE c.model_id = :model_uuid::uuid
  AND a.artefact_tech_label = :artefact_tech_label
`

export { sql }
