const sql = `
SELECT COALESCE(
  (
    SELECT c.cutover_at
    FROM artefact_sync_cutover c
    INNER JOIN artefacts a ON a.artefact_id = c.artefact_id
    WHERE c.model_id = :model_uuid::uuid
      AND a.artefact_tech_label = :artefact_tech_label
  ),
  (
    SELECT MIN(ar.effective_from)::timestamptz
    FROM artefact_realizations_new ar
    INNER JOIN artefacts a ON a.artefact_id = ar.artefact_id
    WHERE ar.model_id = :model_id
      AND a.artefact_tech_label = :artefact_tech_label
  )
) AS cutover_at
`

export { sql }
