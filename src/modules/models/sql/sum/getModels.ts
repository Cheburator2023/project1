const getModels = `
SELECT m_.model_id                                                                                           AS system_model_id,
       m_.models_is_active_flg,
       'sum'                                                                                                 AS model_source,
       m_.model_id                                                                                           AS model_version_id,
       CAST('model' || m_.root_model_id AS Varchar(4000)) || '-v' || CAST(m_.model_version AS Varchar(4000)) AS model_id,
       clsf_.group_company,
       clsf_.business_customer_departament,
       m_.model_name,
       m_.create_date,
       m_.model_version,
       m_.update_date,
       NULL                                                                                                  AS model_indicator,
       NULL                                                                                                  AS calibration_version,
       NULL                                                                                                  AS calibration_date,
       CAST('model' || m_.root_model_id AS Varchar(4000)) || '-v' || CAST(m_.model_version AS Varchar(4000)) AS model_alias,
       dm_.model_type,
       dm_.implementation_validity,
       dm_.validity_approve,
       dm_.remove_decision,
       dm_.DS_DEPARTMENT,
       dm_.developing_start_date,
       dm_.developing_end_date,
       dm_.validity_approve_date,
       dm_.date_of_introduction_into_operation,
       dm_.importance_changes,
       dm_.approve_importance,
       dm_.approve_importance_changes,
       dm_.model_risk_type,
       m_.model_id                                                                                           AS uuid,
       dm_.DS_DEPARTMENT                                                                                     AS ds_stream,
       dm_.model_development_results_approving_flg,
       dm_.rs_model_decommiss_date,
       dm_.rfd,
       dm_.model_epic_04,
       dm_.model_epic_04_date,
       dm_.model_epic_05,
       dm_.model_epic_05a,
       dm_.data_completion_of_stage_05a,
       dm_.model_epic_07,
       dm_.model_epic_07_date,
       dm_.customer_model_id,
       dm_.model_algorithm,
       dm_.release,
       dm_.model_epic_09,
       dm_.model_epic_11,
       dm_.model_epic_11_date,
       dm_.model_epic_12,
       dm_.model_epic_12_date,
       dm_.developing_model_reason,
       dm_.model_desc,
       m_.model_status                                                                               AS camunda_model_status,
       m_.model_stage                                                                                AS camunda_model_stage,
       activeBpmnInstance.bpmn_instance_name                                                                 AS model_status,
       st.status                                                                                             AS business_status,
       -- Используется для подсчета метрик: Динамика моделей по стримам 
       activeBpmnInstance.bpmn_instance_name                                                                 AS bpmn_key,
       NULL                                                                                                  AS model_status_assignee,

       -- Столбцы для дат подтверждения и флагов использования по кварталам
       usage_data.usage_confirm_date_q1,
       usage_data.usage_confirm_date_q2,
       usage_data.usage_confirm_date_q3,
       usage_data.usage_confirm_date_q4,
       usage_data.usage_confirm_flag_q1,
       usage_data.usage_confirm_flag_q2,
       usage_data.usage_confirm_flag_q3,
       usage_data.usage_confirm_flag_q4,

       -- Столбцы для процентов использования по каждой ГБЛ
       allocation_data.allocation_kib_usage,
       allocation_data.allocation_smb_usage,
       allocation_data.allocation_rb_usage,
       allocation_data.allocation_kc_usage,
       allocation_data.allocation_other_usage,

       -- Столбцы для комментариев по каждой ГБЛ
       allocation_data.allocation_kib_comment,
       allocation_data.allocation_smb_comment,
       allocation_data.allocation_rb_comment,
       allocation_data.allocation_kc_comment,
       allocation_data.allocation_other_comment,

       -- Столбец business_customer
       assignee_hist_data.business_customer                                                                  AS business_customer,

       -- Столбец assignment_contractor
       tasks_operations_logs_data.user_name                                                                  AS assignment_contractor,
       -- История этапов (отфильтровано и отсортировано)
        (
          SELECT JSON_AGG(
                   JSON_BUILD_OBJECT(
                     'id', s.id,
                     'stage_name', s.stage,
                     'effective_from', to_char(s.effective_from, 'YYYY-MM-DD"T"HH24:MI:SS'),
                     'effective_to', to_char(s.effective_to, 'YYYY-MM-DD"T"HH24:MI:SS')
                   )
                   ORDER BY s.effective_from DESC
                 )
          FROM model_stage s
          WHERE s.model_id = m_.model_id
        ) AS stage_history,
       -- История статусов (отфильтровано и отсортировано)
        (
        SELECT JSON_AGG(
                 JSON_BUILD_OBJECT(
                   'id', st.id,
                   'status_name', st.status,
                   'effective_from', to_char(st.effective_from, 'YYYY-MM-DD"T"HH24:MI:SS'),
                   'effective_to', to_char(st.effective_to, 'YYYY-MM-DD"T"HH24:MI:SS')
                 )
                 ORDER BY st.effective_from DESC
               )
          FROM model_status st
          WHERE st.model_id = m_.model_id
        ) AS status_history
FROM models m_

         LEFT JOIN (
    SELECT *
    FROM (
             SELECT model_id,
                    user_name,
                    ROW_NUMBER() OVER (
                        PARTITION BY model_id, operation
                        ORDER BY
                            create_date DESC
                        ) AS rn
             FROM tasks_operations_logs
             WHERE task_id = 'development_results_approving'
               AND operation = 'complete'
         ) AS dummy
    WHERE rn = 1
) AS tasks_operations_logs_data
                   ON m_.model_id = tasks_operations_logs_data.model_id

         LEFT JOIN (
    SELECT model_id,
           STRING_AGG(assignee_name, ' | ' ORDER BY effective_from) AS business_customer
    FROM assignee_hist
    WHERE effective_to = TO_TIMESTAMP('9999-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS')
      AND functional_role = 'business_customer'
    GROUP BY model_id
) AS assignee_hist_data
                   ON m_.model_id = assignee_hist_data.model_id

         LEFT JOIN (
    SELECT muh.model_id                                                            AS usage_model_id,
           MAX(CASE WHEN muh.quarter = 1 THEN muh.confirmation_date ELSE NULL END) AS usage_confirm_date_q1,
           MAX(CASE WHEN muh.quarter = 2 THEN muh.confirmation_date ELSE NULL END) AS usage_confirm_date_q2,
           MAX(CASE WHEN muh.quarter = 3 THEN muh.confirmation_date ELSE NULL END) AS usage_confirm_date_q3,
           MAX(CASE WHEN muh.quarter = 4 THEN muh.confirmation_date ELSE NULL END) AS usage_confirm_date_q4,
           COALESCE(
                   CASE
                       WHEN BOOL_OR(muh.quarter = 1 AND muh.confirmed) THEN 'Да'
                       WHEN BOOL_OR(muh.quarter = 1 AND NOT muh.confirmed) THEN 'Нет'
                       ELSE NULL
                       END,
                   NULL
               )                                                                   AS usage_confirm_flag_q1,
           COALESCE(
                   CASE
                       WHEN BOOL_OR(muh.quarter = 2 AND muh.confirmed) THEN 'Да'
                       WHEN BOOL_OR(muh.quarter = 2 AND NOT muh.confirmed) THEN 'Нет'
                       ELSE NULL
                       END,
                   NULL
               )                                                                   AS usage_confirm_flag_q2,
           COALESCE(
                   CASE
                       WHEN BOOL_OR(muh.quarter = 3 AND muh.confirmed) THEN 'Да'
                       WHEN BOOL_OR(muh.quarter = 3 AND NOT muh.confirmed) THEN 'Нет'
                       ELSE NULL
                       END,
                   NULL
               )                                                                   AS usage_confirm_flag_q3,
           COALESCE(
                   CASE
                       WHEN BOOL_OR(muh.quarter = 4 AND muh.confirmed) THEN 'Да'
                       WHEN BOOL_OR(muh.quarter = 4 AND NOT muh.confirmed) THEN 'Нет'
                       ELSE NULL
                       END,
                   NULL
               )                                                                   AS usage_confirm_flag_q4
    FROM model_usage_confirm AS muh
    WHERE (muh.quarter IN (1, 2, 3)
        AND muh.confirmation_year = EXTRACT(YEAR FROM CURRENT_DATE))
       OR (:use_previous_year_for_q4 = TRUE AND muh.quarter = 4
        AND muh.confirmation_year = EXTRACT(YEAR FROM CURRENT_DATE) - 1)
       OR (:use_previous_year_for_q4 = FALSE AND muh.quarter = 4
        AND muh.confirmation_year = EXTRACT(YEAR FROM CURRENT_DATE))
    GROUP BY muh.model_id
) AS usage_data
                   ON m_.model_id = usage_data.usage_model_id

         LEFT JOIN (
    SELECT mah.model_id                                                                     AS allocation_model_id,
           MAX(CASE WHEN mah.gbl_name = 'КИБ' THEN mah.allocation_percent ELSE NULL END)    AS allocation_kib_usage,
           MAX(CASE WHEN mah.gbl_name = 'СМБ' THEN mah.allocation_percent ELSE NULL END)    AS allocation_smb_usage,
           MAX(CASE WHEN mah.gbl_name = 'РБ' THEN mah.allocation_percent ELSE NULL END)     AS allocation_rb_usage,
           MAX(CASE WHEN mah.gbl_name = 'КЦ' THEN mah.allocation_percent ELSE NULL END)     AS allocation_kc_usage,
           MAX(CASE WHEN mah.gbl_name = 'Другое' THEN mah.allocation_percent ELSE NULL END) AS allocation_other_usage,

           MAX(CASE WHEN mah.gbl_name = 'КИБ' THEN mah.comment ELSE NULL END)               AS allocation_kib_comment,
           MAX(CASE WHEN mah.gbl_name = 'СМБ' THEN mah.comment ELSE NULL END)               AS allocation_smb_comment,
           MAX(CASE WHEN mah.gbl_name = 'РБ' THEN mah.comment ELSE NULL END)                AS allocation_rb_comment,
           MAX(CASE WHEN mah.gbl_name = 'КЦ' THEN mah.comment ELSE NULL END)                AS allocation_kc_comment,
           MAX(CASE WHEN mah.gbl_name = 'Другое' THEN mah.comment ELSE NULL END)            AS allocation_other_comment
    FROM (
             SELECT model_id,
                    allocation_name AS gbl_name,
                    percentage      AS allocation_percent,
                    comment
             FROM model_allocation_usage mah
                      INNER JOIN model_allocations gbl ON mah.allocation_id = gbl.allocation_id
         ) AS mah
    GROUP BY mah.model_id
) AS allocation_data
                   ON m_.model_id = allocation_data.allocation_model_id

         LEFT JOIN (SELECT ar_.model_id,
                           STRING_AGG((CASE WHEN ar_.artefact_id = 57 THEN av_.artefact_value_id ELSE NULL END)::Varchar, ','
                                      ORDER BY ar_.artefact_value_id) AS product_and_scope_id,
                           STRING_AGG((CASE WHEN ar_.artefact_id = 73 THEN av_.artefact_value ELSE NULL END)::Varchar, ','
                                      ORDER BY ar_.artefact_value_id) AS group_company,
                           STRING_AGG((CASE WHEN ar_.artefact_id = 6 THEN av_.artefact_value ELSE NULL END)::Varchar, ','
                                      ORDER BY ar_.artefact_value_id) AS business_customer_departament
                    FROM artefact_realizations ar_
                             INNER JOIN artefact_values av_ ON ar_.artefact_value_id = av_.artefact_value_id AND av_.is_active_flg = '1'
                    WHERE ar_.artefact_id IN (173, 6, 67, 73)
                      AND ar_.effective_to = TO_TIMESTAMP('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
                    GROUP BY ar_.model_id) clsf_ ON m_.model_id = clsf_.model_id
         LEFT JOIN
     (
         SELECT model_id,
                STRING_AGG(status, ';') AS status
         FROM (
                  SELECT model_id,
                         CASE
                             WHEN (artefact_id = 896)
                                 AND (artefact_value_id IN (685))
                                 THEN 'Модель не эффективна в бизнес-процессе'
                             WHEN (artefact_id = 827)
                                 AND (artefact_value_id IN (642))
                                 THEN 'Модель не эффективна в бизнес-процессе'
                             WHEN artefact_id = 52
                                 AND artefact_string_value = 'Нет, доработки не актуальны'
                                 THEN 'Модель не эффективна в бизнес-процессе'

                             WHEN artefact_id = 174
                                 AND (artefact_string_value IS NULL OR artefact_string_value = 'false')
                                 THEN 'Разработана, не внедрена'
                             WHEN artefact_id = 201
                                 AND (artefact_value_id IN (313, 314, 315))
                                 THEN artefact_string_value
                             WHEN artefact_id = 896
                                 AND (artefact_value_id IN (683))
                                 THEN 'Разработана, не внедрена'
                             WHEN artefact_id = 827
                                 AND (artefact_value_id IN (642, 643))
                                 THEN 'Разработана, не внедрена'
                             WHEN artefact_id = 822
                                 AND (artefact_value_id IN (637))
                                 THEN 'Разработана, не внедрена'
                             WHEN artefact_id = 367
                                 AND (artefact_value_id IN (519))
                                 THEN 'Разработана, не внедрена'
                             WHEN artefact_id = 373
                                 AND (artefact_value_id IN (411))
                                 THEN 'Разработана, не внедрена'

                             WHEN artefact_id = 323
                                 AND (artefact_value_id IN (426))
                                 THEN 'Архив'
                             WHEN artefact_id = 351
                                 AND (artefact_value_id IN (399))
                                 THEN 'Архив'
                             WHEN artefact_id = 152
                                 AND (artefact_value_id IN (35))
                                 THEN 'Архив'
                             WHEN artefact_id = 822
                                 AND (artefact_value_id IN (638))
                                 THEN 'Архив'
                             WHEN artefact_id = 818
                                 AND (artefact_value_id IN (632))
                                 THEN 'Архив'
                             WHEN (artefact_id = 789)
                                 AND (artefact_string_value IS NOT NULL)
                                 THEN 'Архив'

                             WHEN artefact_id = 323
                                 AND (artefact_value_id IN (427))
                                 THEN 'Разработана, не внедрена'

                             WHEN (artefact_id = 780 OR artefact_id = 779)
                                 AND artefact_string_value = 'true'
                                 THEN 'Вывод модели из эксплуатации'

                             WHEN (artefact_id = 853)
                                 AND (artefact_value_id IN (657, 658))
                                 THEN 'Разработана, внедрена в ПИМ'
                             WHEN (artefact_id = 872)
                                 AND (artefact_value_id IN (667))
                                 THEN 'Разработана, внедрена в ПИМ'
                             WHEN (artefact_id = 890)
                                 AND (artefact_value_id IN (670))
                                 THEN 'Разработана, внедрена в ПИМ'

                             WHEN (artefact_id = 827)
                                 AND (artefact_value_id IN (641))
                                 THEN 'Разработана, внедрена вне ПИМ'
                             WHEN (artefact_id = 853)
                                 AND (artefact_value_id IN (659))
                                 THEN 'Разработана, внедрена вне ПИМ'
                             WHEN (artefact_id = 896)
                                 AND (artefact_value_id IN (684))
                                 THEN 'Разработана, внедрена вне ПИМ'

                             WHEN (artefact_id = 825)
                                 AND (artefact_string_value = 'true')
                                 THEN 'Опытная эксплуатация на контуре разработки'
                             END AS status
                  FROM artefact_realizations
                  WHERE effective_to = TO_TIMESTAMP('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
              ) AS FOO
         GROUP BY model_id
     ) st
     ON m_.model_id = st.model_id
         LEFT JOIN (
    SELECT t2.model_id,
           t2.bpmn_instance_name,
           t2.effective_from
    FROM (
             SELECT t1.model_id,
                    t1.bpmn_instance_name,
                    t1.effective_from,
                    ROW_NUMBER() OVER (
                        PARTITION BY t1.model_id
                        ORDER BY
                            t1.effective_from DESC
                        ) AS rnrn_
             FROM (
                      SELECT bbii.model_id,
                             bbii.bpmn_key_desc AS bpmn_instance_name,
                             bbii.effective_from
                      FROM (
                               SELECT bbbiii.model_id,
                                      bbbppp.bpmn_key_desc,
                                      bbbiii.bpmn_key_id,
                                      bbbiii.effective_from,
                                      ROW_NUMBER() OVER (
                                          PARTITION BY bbbiii.model_id
                                          ORDER BY
                                              bbbiii.effective_to DESC,
                                              bbbiii.effective_from DESC,
                                              bbbiii.bpmn_key_id DESC
                                          ) AS rn_
                               FROM bpmn_instances bbbiii
                                        INNER JOIN bpmn_processes bbbppp ON bbbiii.bpmn_key_id = bbbppp.bpmn_key_id
                           ) bbii
                      WHERE bbii.rn_ = 1
                  ) t1
         ) t2
    WHERE t2.rnrn_ = 1
) AS activeBpmnInstance
                   ON m_.model_id = activeBpmnInstance.model_id
         LEFT JOIN (SELECT model_id,
                           MAX(CASE WHEN ARTEFACT_ID = 7 THEN ARTEFACT_STRING_VALUE ELSE NULL END)   AS DS_DEPARTMENT,
                           MAX(CASE WHEN ARTEFACT_ID = 72 THEN ARTEFACT_STRING_VALUE ELSE NULL END)  AS model_type,
                           MAX(CASE WHEN ARTEFACT_ID = 786 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS implementation_validity,
                           MAX(CASE WHEN ARTEFACT_ID = 787 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS validity_approve,
                           MAX(CASE WHEN ARTEFACT_ID = 788 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS validity_approve_date,
                           MAX(CASE WHEN ARTEFACT_ID = 789 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS remove_decision,
                           MAX(CASE WHEN ARTEFACT_ID = 33 THEN ARTEFACT_STRING_VALUE ELSE NULL END)  AS developing_start_date,
                           -- Схемы версии 2 работают с атрибутом 34/developing_end_date
                           -- Схемы версии 3 работают с атрибутов 900/model_epic_05_date (заведен по ошибке)
                           -- На выходе должны получить одно значение в колонке developing_end_date
                           COALESCE(
                                   MAX(CASE WHEN artefact_id = 34 THEN artefact_string_value ELSE NULL END),
                                   MAX(CASE WHEN artefact_id = 900 THEN artefact_string_value ELSE NULL END)
                               )                                                                     AS developing_end_date,
                           MAX(CASE WHEN ARTEFACT_ID = 871 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS date_of_introduction_into_operation,
                           MAX(CASE WHEN ARTEFACT_ID = 781 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS model_algorithm,
                           MAX(CASE WHEN ARTEFACT_ID = 794 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS importance_changes,
                           MAX(CASE WHEN ARTEFACT_ID = 795 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS approve_importance,
                           MAX(CASE WHEN ARTEFACT_ID = 796 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS approve_importance_changes,
                           MAX(CASE WHEN ARTEFACT_ID = 797 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS model_risk_type,
                           MAX(CASE WHEN ARTEFACT_ID = 123 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS solution_to_implement_model,
                           MAX(CASE WHEN ARTEFACT_ID = 888 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS rs_model_decommiss_date,
                           MAX(CASE WHEN ARTEFACT_ID = 803 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS rfd,
                           MAX(CASE WHEN ARTEFACT_ID = 811 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS model_epic_04,
                           MAX(CASE WHEN ARTEFACT_ID = 812 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS model_epic_04_date,
                           MAX(CASE WHEN ARTEFACT_ID = 820 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS model_epic_05a,
                           MAX(CASE WHEN ARTEFACT_ID = 821 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS data_completion_of_stage_05a,
                           MAX(CASE WHEN ARTEFACT_ID = 823 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS model_epic_05,
                           MAX(CASE WHEN artefact_id = 827 THEN artefact_string_value ELSE NULL END) AS model_development_results_approving_flg,
                           MAX(CASE WHEN ARTEFACT_ID = 839 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS model_epic_07,
                           MAX(CASE WHEN ARTEFACT_ID = 840 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS model_epic_07_date,
                           MAX(CASE WHEN ARTEFACT_ID = 873 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS customer_model_id,
                           MAX(CASE WHEN ARTEFACT_ID = 867 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS release,
                           MAX(CASE WHEN ARTEFACT_ID = 868 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS model_epic_09,
                           MAX(CASE WHEN ARTEFACT_ID = 869 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS model_epic_11,
                           MAX(CASE WHEN ARTEFACT_ID = 870 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS model_epic_11_date,
                           MAX(CASE WHEN ARTEFACT_ID = 898 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS model_epic_12,
                           MAX(CASE WHEN ARTEFACT_ID = 899 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS model_epic_12_date,
                           MAX(CASE WHEN ARTEFACT_ID = 69 THEN ARTEFACT_STRING_VALUE ELSE NULL END)  AS developing_model_reason,
                           MAX(CASE WHEN ARTEFACT_ID = 905 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS model_desc
                    FROM artefact_realizations
                    WHERE effective_to = TO_TIMESTAMP('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
                    AND artefact_id IN (7, 72, 786, 787, 788, 789, 33, 34,
                                        790, 781, 788, 871, 794, 795, 796, 797,
                                        123, 888, 803, 811, 812, 820, 821, 823, 827, 839, 840, 873,
                                        867, 868, 869, 870, 898, 899, 900, 69, 905)
                    AND (
                          :filter_date::Date IS NULL
                          OR TO_DATE(CAST(:filter_date AS Varchar(4000)), 'YYYY-MM-DD')
                              BETWEEN DATE_TRUNC('day', effective_from)::Date AND DATE_TRUNC('day', effective_to)::Date
                      )
                    GROUP BY model_id) dm_ ON m_.model_id = dm_.model_id
WHERE dm_.model_desc IS DISTINCT FROM 'AutoML'
  AND (:model_id::Varchar IS NULL OR m_.model_id = :model_id)
  AND (m_.temp_block_flag != 1 OR m_.temp_block_flag IS NULL)
  AND (
        :filter_date::Date IS NULL
        OR TO_DATE(CAST(:filter_date AS Varchar(4000)), 'YYYY-MM-DD')
            BETWEEN DATE_TRUNC('day', m_.create_date)::Date AND DATE_TRUNC('day', NOW())::Date
    )
`;

export { getModels };
