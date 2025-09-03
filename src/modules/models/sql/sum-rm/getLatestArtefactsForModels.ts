const getLatestArtefactsForModels = `
SELECT model_id,
       artefact_id,
       artefact_string_value,
       effective_from
FROM (
  SELECT
    ar.model_id,
    ar.artefact_id,
    ar.artefact_string_value,
    ar.effective_from,
    ROW_NUMBER() OVER (
      PARTITION BY ar.model_id, ar.artefact_id
      ORDER BY ar.effective_from DESC
    ) AS rn
  FROM artefact_realizations_new ar
  WHERE ar.effective_to = TO_TIMESTAMP('9999-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS')
    AND ar.artefact_id = ANY(:artefact_ids::numeric[])
    AND ar.model_id = ANY(:model_ids::varchar[])
    AND (
      :filter_date::DATE IS NULL
      OR TO_DATE(CAST(:filter_date AS VARCHAR(4000)), 'YYYY-MM-DD')
         BETWEEN DATE_TRUNC('day', ar.effective_from)::DATE AND DATE_TRUNC('day', ar.effective_to)::DATE
    )
) t
WHERE t.rn = 1
`

export { getLatestArtefactsForModels }
