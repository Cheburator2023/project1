const updateModelAllocation = `
WITH upsert AS (
    INSERT INTO models_allocation (model_id, gbl_id, allocation_percent, comment)
        SELECT cte.model_id,
               cte.gbl_id,
               COALESCE(cte.allocation_percent, models_allocation.allocation_percent),
               COALESCE(cte.comment, models_allocation.comment)
        FROM (
                 SELECT DISTINCT :model_id                       AS model_id,
                                 :gbl_id::Int                    AS gbl_id,
                                 NULLIF(:percent::Numeric, NULL) AS allocation_percent,
                                 NULLIF(:comment, NULL)          AS comment
             ) AS cte
                 LEFT JOIN models_allocation
                           ON cte.model_id = models_allocation.model_id
                               AND cte.gbl_id = models_allocation.gbl_id
        ON CONFLICT (gbl_id, model_id)
            DO UPDATE
                SET allocation_percent = COALESCE(EXCLUDED.allocation_percent, models_allocation.allocation_percent),
                    comment = COALESCE(EXCLUDED.comment, models_allocation.comment)
        RETURNING allocation_id, model_id, gbl_id, allocation_percent, comment
)
INSERT
INTO models_allocation_history (allocation_id, model_id, gbl_id, allocation_percent, comment, changed_by)
SELECT *,
       'admin' as changed_by
FROM upsert
`;

export { updateModelAllocation };
