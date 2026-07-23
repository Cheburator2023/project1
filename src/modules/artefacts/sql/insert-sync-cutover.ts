const sql = `
INSERT INTO artefact_sync_cutover (model_id, artefact_id, cutover_at, broken_by)
SELECT :model_uuid::uuid, a.artefact_id, latest.effective_from, :broken_by
FROM artefacts a
INNER JOIN artefact_history_source hs
  ON hs.artefact_id = a.artefact_id
 AND hs.model_source = 'sum'
 AND hs.history_source = 'partial_sync'
INNER JOIN LATERAL (
  SELECT MAX(ar.effective_from) AS effective_from
  FROM artefact_realizations_new ar
  WHERE ar.model_id = :model_id
    AND ar.artefact_id = a.artefact_id
) latest ON latest.effective_from IS NOT NULL
WHERE a.artefact_tech_label = :artefact_tech_label
ON CONFLICT (model_id, artefact_id) DO NOTHING
`

export { sql }
