export const modelStageActiveJoin = `
LEFT JOIN (
    SELECT
        model_id,
        ARRAY_TO_STRING(ARRAY_AGG(stage ORDER BY effective_from DESC), ';') AS active_stage
    FROM model_stage
    WHERE effective_to = TO_TIMESTAMP('9999-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS')
    GROUP BY model_id
) AS model_stage_hist
  ON m_.model_id = model_stage_hist.model_id
`

export const modelStageHistoryJoin = `
LEFT JOIN (
    SELECT
        model_id,
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'stage', stage,
                'effective_from', effective_from,
                'effective_to', effective_to
            ) ORDER BY effective_from DESC
        ) AS history
    FROM model_stage
    GROUP BY model_id
) AS model_stage_history
  ON m_.model_id = model_stage_history.model_id
`
