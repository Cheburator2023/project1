const getModels = `
SELECT m_.model_id                                                                                           AS system_model_id,
       'sum'                                                                                                 AS model_source,
       m_.model_id                                                                                           AS model_version_id,
       CAST('model' || m_.root_model_id AS Varchar(4000)) || '-v' || CAST(m_.model_version AS Varchar(4000)) AS model_id,
       clsf_.group_company,
       m_.model_name,
       m_.model_desc,
       m_.create_date,
       m_.model_version,
       null                                                                                          AS model_indicator,
       null                                                                                          AS calibration_version,
       null                                                                                          AS calibration_date,
       CAST('model' || m_.root_model_id AS Varchar(4000)) || '-v' || CAST(m_.model_version AS Varchar(4000)) AS model_alias,
       dm_.significance_validity,
       dm_.segment_name,
       dm_.implementation_segment,
       dm_.business_customer,
       clsf_.CUSTOMER_DEPT                                                                                   AS business_customer_departament,
       dm_.implementation_validity,
       dm_.validity_approve,
       dm_.validation_report_approve_date,
       dm_.remove_decision,
       dm_.DS_DEPARTMENT,
       dm_.developing_start_date,
       dm_.developing_end_date,
       dm_.data_source_description,
       dm_.target,
       dm_.analize_text_about_developing,
       dm_.psi_protocol,
       dm_.validation_department,
       dm_.validation_period,
       dm_.validity_approve_date,
       dm_.validation_result,
       dm_.validation_result_approve_date,
       dm_.auto_validation_result,
       dm_.importance_changes,
       dm_.approve_importance,
       dm_.approve_importance_changes,
       dm_.model_risk_type,
       dm_.model_changes_info,
       m_.model_id                                                                                           AS uuid,
       dm_.DS_DEPARTMENT                                                                                     AS ds_stream,
       null                                                                                          AS assignment_contractor,
       dm_.solution_to_implement_model,
       COALESCE(NULLIF(m_.models_is_active_flg, ''), '1')                                                    AS active_model,
       null                                                                                          AS model_status,
       null                                                                                          AS model_status_assignee,

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
        allocation_data.allocation_other_comment
FROM models m_
 LEFT JOIN (
    SELECT
        muh.model_id                                                                                            AS usage_model_id,
        MAX(CASE WHEN EXTRACT(QUARTER FROM muh.confirmation_date) = 1 THEN muh.confirmation_date ELSE NULL END) AS usage_confirm_date_q1,
        MAX(CASE WHEN EXTRACT(QUARTER FROM muh.confirmation_date) = 2 THEN muh.confirmation_date ELSE NULL END) AS usage_confirm_date_q2,
        MAX(CASE WHEN EXTRACT(QUARTER FROM muh.confirmation_date) = 3 THEN muh.confirmation_date ELSE NULL END) AS usage_confirm_date_q3,
        MAX(CASE WHEN EXTRACT(QUARTER FROM muh.confirmation_date) = 4 THEN muh.confirmation_date ELSE NULL END) AS usage_confirm_date_q4,
        MAX(CASE WHEN EXTRACT(QUARTER FROM muh.confirmation_date) = 1 AND muh.confirmed THEN 'Да' ELSE 'Нет' END)    AS usage_confirm_flag_q1,
        MAX(CASE WHEN EXTRACT(QUARTER FROM muh.confirmation_date) = 2 AND muh.confirmed THEN 'Да' ELSE 'Нет' END)    AS usage_confirm_flag_q2,
        MAX(CASE WHEN EXTRACT(QUARTER FROM muh.confirmation_date) = 3 AND muh.confirmed THEN 'Да' ELSE 'Нет' END)    AS usage_confirm_flag_q3,
        MAX(CASE WHEN EXTRACT(QUARTER FROM muh.confirmation_date) = 4 AND muh.confirmed THEN 'Да' ELSE 'Нет' END)    AS usage_confirm_flag_q4
    FROM model_usage_confirm as muh
    GROUP BY muh.model_id
) AS usage_data
ON m_.model_id = usage_data.usage_model_id

LEFT JOIN (
    SELECT
        mah.model_id                                                                     AS allocation_model_id,
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
        SELECT
            model_id,
            allocation_name as gbl_name,
            percentage as allocation_percent,
            comment
        FROM model_allocation_usage mah
        INNER JOIN model_allocations gbl ON mah.allocation_id = gbl.allocation_id
    ) AS mah
    GROUP BY mah.model_id
) AS allocation_data
ON m_.model_id = allocation_data.allocation_model_id
         LEFT JOIN (SELECT ar_.model_id,
                           STRING_AGG((CASE WHEN ar_.artefact_id = 57 THEN av_.artefact_value_id ELSE NULL END)::Varchar, ','
                                      ORDER BY ar_.artefact_value_id)                           AS product_and_scope_id,
                           STRING_AGG((CASE WHEN ar_.artefact_id = 73 THEN av_.artefact_value ELSE NULL END)::Varchar, ' > '
                                      ORDER BY ar_.artefact_value_id)                           AS group_company,
                           MAX(CASE WHEN ar_.ARTEFACT_ID = 6 THEN ARTEFACT_VALUE ELSE NULL END) AS CUSTOMER_DEPT
                    FROM artefact_realizations ar_
                             INNER JOIN artefact_values av_ ON ar_.artefact_value_id = av_.artefact_value_id AND av_.is_active_flg = '1'
                    WHERE ar_.artefact_id IN (173, 6, 67, 73)
                      AND ar_.effective_to = TO_TIMESTAMP('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
                    GROUP BY ar_.model_id) clsf_ ON m_.model_id = clsf_.model_id
         LEFT JOIN (SELECT model_id,
                           MAX(CASE WHEN artefact_id = 58 THEN artefact_string_value ELSE NULL END)  AS segment_name,
                           MAX(CASE WHEN ARTEFACT_ID = 7 THEN ARTEFACT_STRING_VALUE ELSE NULL END)   AS DS_DEPARTMENT,
                           MAX(CASE WHEN ARTEFACT_ID = 67 THEN ARTEFACT_STRING_VALUE ELSE NULL END)  AS significance_validity,
                           MAX(CASE WHEN ARTEFACT_ID = 782 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS model_is_used,
                           MAX(CASE WHEN ARTEFACT_ID = 783 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS implementation_decision,
                           MAX(CASE WHEN ARTEFACT_ID = 785 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS implementation_segment,
                           MAX(CASE WHEN ARTEFACT_ID = 309 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS business_customer,
                           MAX(CASE WHEN ARTEFACT_ID = 786 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS implementation_validity,
                           MAX(CASE WHEN ARTEFACT_ID = 787 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS validity_approve,
                           MAX(CASE WHEN ARTEFACT_ID = 788 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS validity_approve_date,
                           MAX(CASE WHEN ARTEFACT_ID = 789 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS remove_decision,
                           MAX(CASE WHEN ARTEFACT_ID = 33 THEN ARTEFACT_STRING_VALUE ELSE NULL END)  AS developing_start_date,
                           MAX(CASE WHEN ARTEFACT_ID = 34 THEN ARTEFACT_STRING_VALUE ELSE NULL END)  AS developing_end_date,
                           MAX(CASE WHEN ARTEFACT_ID = 103 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS data_source_description,
                           MAX(CASE WHEN ARTEFACT_ID = 277 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS target,
                           MAX(CASE WHEN ARTEFACT_ID = 249 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS analize_text_about_developing,
                           MAX(CASE WHEN ARTEFACT_ID = 346 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS psi_protocol,
                           MAX(CASE WHEN ARTEFACT_ID = 790 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS validation_department,
                           MAX(CASE WHEN ARTEFACT_ID = 791 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS validation_period,
                           MAX(CASE WHEN ARTEFACT_ID = 507 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS validation_result,
                           MAX(CASE WHEN ARTEFACT_ID = 792 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS validation_report_approve_date,
                           MAX(CASE WHEN ARTEFACT_ID = 793 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS validation_result_approve_date,
                           MAX(CASE WHEN ARTEFACT_ID = 256 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS auto_validation_result,
                           MAX(CASE WHEN ARTEFACT_ID = 794 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS importance_changes,
                           MAX(CASE WHEN ARTEFACT_ID = 795 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS approve_importance,
                           MAX(CASE WHEN ARTEFACT_ID = 796 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS approve_importance_changes,
                           MAX(CASE WHEN ARTEFACT_ID = 797 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS model_risk_type,
                           MAX(CASE WHEN ARTEFACT_ID = 798 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS model_changes_info,
                           MAX(CASE WHEN ARTEFACT_ID = 123 THEN ARTEFACT_STRING_VALUE ELSE NULL END) AS solution_to_implement_model
                    FROM artefact_realizations
                    WHERE effective_to = TO_TIMESTAMP('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
                      AND artefact_id IN (7, 58, 67, 782, 783, 785, 309, 786, 787, 788, 789, 33, 34, 103, 277, 249,
                                          346, 790, 791, 788, 507, 792, 793, 256, 794, 795, 796, 797, 798, 123)
                      AND (
                            :filter_date::Date IS NULL
                            OR TO_DATE(CAST(:filter_date AS Varchar(4000)), 'YYYY-MM-DD')
                                BETWEEN DATE_TRUNC('day', effective_from)::Date AND DATE_TRUNC('day', effective_to)::Date
                        )
                    GROUP BY model_id) dm_ ON m_.model_id = dm_.model_id
WHERE m_.MODEL_DESC != 'AutoML'
  AND (
        :filter_date::Date IS NULL
        OR TO_DATE(CAST(:filter_date AS Varchar(4000)), 'YYYY-MM-DD')
            BETWEEN DATE_TRUNC('day', m_.create_date)::Date AND DATE_TRUNC('day', NOW())::Date
    )
`;

export { getModels };
