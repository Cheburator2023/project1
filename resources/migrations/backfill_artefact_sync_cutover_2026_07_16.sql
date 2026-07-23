BEGIN;

WITH ps AS (
    SELECT a.artefact_id
    FROM artefacts a
    INNER JOIN artefact_history_source hs
      ON hs.artefact_id = a.artefact_id
     AND hs.model_source = 'sum'
     AND hs.history_source = 'partial_sync'
),
first_real AS (
    SELECT DISTINCT ON (ar.model_id, ar.artefact_id)
        ar.model_id::uuid AS model_id,
        ar.artefact_id,
        ar.effective_from AS cutover_at,
        ar.creator AS broken_by
    FROM artefact_realizations_new ar
    INNER JOIN ps ON ps.artefact_id = ar.artefact_id
    WHERE NULLIF(TRIM(ar.creator), '') IS NOT NULL
      AND LOWER(TRIM(ar.creator)) IS DISTINCT FROM 'unknown'
    ORDER BY ar.model_id, ar.artefact_id, ar.effective_from ASC
)
INSERT INTO artefact_sync_cutover (model_id, artefact_id, cutover_at, broken_by)
SELECT fr.model_id, fr.artefact_id, fr.cutover_at, fr.broken_by
FROM first_real fr
ON CONFLICT (model_id, artefact_id) DO UPDATE
SET
    cutover_at = LEAST(artefact_sync_cutover.cutover_at, EXCLUDED.cutover_at),
    broken_by = CASE
        WHEN EXCLUDED.cutover_at < artefact_sync_cutover.cutover_at
            THEN EXCLUDED.broken_by
        ELSE artefact_sync_cutover.broken_by
    END;

SELECT COUNT(*) AS cutover_rows FROM artefact_sync_cutover;

COMMIT;
