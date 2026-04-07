export const modelStatusActiveJoin = `
LEFT JOIN (
    SELECT DISTINCT ON (model_id)
        model_id,
        status
    FROM sumd.model_status
    WHERE effective_to = TO_TIMESTAMP('9999-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS')
    ORDER BY model_id, effective_from DESC
) AS model_status_hist
  ON m_.model_id = model_status_hist.model_id
`

export const modelStatusHistoryJoin = `
LEFT JOIN (
    SELECT
        model_id,
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'status', status,
                'effective_from', effective_from,
                'effective_to', effective_to
            ) ORDER BY effective_from DESC
        ) AS history
    FROM sumd.model_status
    GROUP BY model_id
) AS model_status_history
  ON m_.model_id = model_status_history.model_id
`
