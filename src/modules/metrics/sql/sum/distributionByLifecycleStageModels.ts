const distributionByLifecycleStageModels = `
SELECT CASE
           WHEN bp.bpmn_key_desc = 'initialization' THEN 'Инициализация'
           WHEN bp.bpmn_key_desc = 'data_pilot' THEN 'Пилот данных'
           WHEN bp.bpmn_key_desc = 'data_search' THEN 'Поиск данных'
           WHEN bp.bpmn_key_desc = 'model' THEN 'Разработка модели'
           WHEN bp.bpmn_key_desc = 'data_build' THEN 'Разработка витрины'
           WHEN bp.bpmn_key_desc = 'integration' THEN 'Внедрение'
           WHEN bp.bpmn_key_desc = 'fast_model_process' THEN 'Сокращенное з-ние'
           WHEN bp.bpmn_key_desc = 'model_pilot' THEN 'Пилотирование модели'
           WHEN bp.bpmn_key_desc = 'inegration_model' THEN 'Продуктивизация модели'
           WHEN bp.bpmn_key_desc = 'fullvalidation_datamart' THEN 'Разработка витрины для полной валидации'
           END AS bpmn_key_desc,
       COUNT(bi.model_id)::numeric AS count
FROM bpmn_processes AS bp
LEFT JOIN (
    SELECT model_id,
           bpmn_key_id,
           ROW_NUMBER() OVER (PARTITION BY model_id ORDER BY create_dttm DESC) AS row_num
    FROM bpmn_instances
    WHERE (
        $1::Date IS NULL
        OR (
            effective_from <= $2::Date
            AND (effective_to IS NULL OR effective_to >= $1::Date)
        )
    )
) AS bi
ON bp.bpmn_key_id = bi.bpmn_key_id
   AND bi.row_num = 1
WHERE bp.bpmn_key_desc IN ('initialization', 'data_pilot', 'data_search', 'model', 'data_build', 'integration', 'fast_model_process')
GROUP BY bp.bpmn_key_desc
ORDER BY CASE
             WHEN bp.bpmn_key_desc = 'initialization' THEN 1
             WHEN bp.bpmn_key_desc = 'data_search' THEN 2
             WHEN bp.bpmn_key_desc = 'data_build' THEN 3
             WHEN bp.bpmn_key_desc = 'model' THEN 4
             WHEN bp.bpmn_key_desc = 'data_pilot' THEN 5
             WHEN bp.bpmn_key_desc = 'integration' THEN 6
             WHEN bp.bpmn_key_desc = 'fast_model_process' THEN 7
             END;
`;

export { distributionByLifecycleStageModels };
