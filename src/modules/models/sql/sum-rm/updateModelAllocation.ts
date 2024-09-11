const updateModelAllocation = `
WITH cte AS (
    SELECT DISTINCT :model_id                       AS model_id,
                    :gbl_id::Int                        AS gbl_id,
                    NULLIF(:percent::Numeric, NULL) AS allocation_percent,
                    NULLIF(:comment, NULL)          AS comment
)
INSERT
INTO models_allocation (model_id, gbl_id, allocation_percent, comment)
SELECT cte.model_id,
       cte.gbl_id,
       COALESCE(cte.allocation_percent, models_allocation.allocation_percent),
       COALESCE(cte.comment, models_allocation.comment)
FROM cte
         LEFT JOIN models_allocation
                   ON cte.model_id = models_allocation.model_id
                       AND cte.gbl_id = models_allocation.gbl_id
ON CONFLICT (gbl_id, model_id)
    DO UPDATE
    SET allocation_percent = COALESCE(EXCLUDED.allocation_percent, models_allocation.allocation_percent),
        comment            = COALESCE(EXCLUDED.comment, models_allocation.comment)
RETURNING model_id, gbl_id;
`

export { updateModelAllocation }
