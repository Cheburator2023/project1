const getModels = `
SELECT
    m.model_id AS system_model_id,
    m.model_name,
    m.model_version,
    m.create_date,
    m.update_date,
    CASE
        WHEN m.root_model_id != '' THEN
            (CAST('model' AS VARCHAR(4000)) ||  m.root_model_id || '-v' || CAST(m.model_version AS VARCHAR(4000)))
        ELSE NULL
    END AS model_alias,

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

    -- Столбцы всех артефактов
    artefact_data.*,

    -- COALESCE(NULLIF(m.models_is_active_flg, ''), '1') AS active_model,

    -- Флаг для взаимосвязей
    CASE
        WHEN EXISTS(
            SELECT 1
                FROM models_new mn
                WHERE mn.parent_model_id = m.model_id
                AND mn.type_id IS NOT NULL
            ) THEN '1'
        ELSE '0'
    END AS relations,

    -- Источник модели
    'sum-rm' AS model_source,
    
    -- Этап ЖЦМ Модели (всегда берем значение из СУМ, для этого явно прописываем model_status и business_status как null)
    null as model_status,
    null as business_status
FROM models_new m
         LEFT JOIN (
    SELECT
        muh.model_id                                                                                            AS usage_model_id,
        MAX(CASE WHEN EXTRACT(QUARTER FROM muh.confirmation_date) = 1 THEN muh.confirmation_date ELSE NULL END) AS usage_confirm_date_q1,
        MAX(CASE WHEN EXTRACT(QUARTER FROM muh.confirmation_date) = 2 THEN muh.confirmation_date ELSE NULL END) AS usage_confirm_date_q2,
        MAX(CASE WHEN EXTRACT(QUARTER FROM muh.confirmation_date) = 3 THEN muh.confirmation_date ELSE NULL END) AS usage_confirm_date_q3,
        MAX(CASE WHEN EXTRACT(QUARTER FROM muh.confirmation_date) = 4 THEN muh.confirmation_date ELSE NULL END) AS usage_confirm_date_q4,
        COALESCE(
            CASE
                WHEN BOOL_OR(EXTRACT(QUARTER FROM muh.confirmation_date) = 1 AND muh.is_used) THEN 'Да'
                WHEN BOOL_OR(EXTRACT(QUARTER FROM muh.confirmation_date) = 1 AND NOT muh.is_used) THEN 'Нет'
                ELSE NULL
                END,
            NULL
        ) AS usage_confirm_flag_q1,
        COALESCE(
        CASE
            WHEN BOOL_OR(EXTRACT(QUARTER FROM muh.confirmation_date) = 2 AND muh.is_used) THEN 'Да'
            WHEN BOOL_OR(EXTRACT(QUARTER FROM muh.confirmation_date) = 2 AND NOT muh.is_used) THEN 'Нет'
            ELSE NULL
            END,
        NULL
        ) AS usage_confirm_flag_q2,
        COALESCE(
            CASE
                WHEN BOOL_OR(EXTRACT(QUARTER FROM muh.confirmation_date) = 3 AND muh.is_used) THEN 'Да'
                WHEN BOOL_OR(EXTRACT(QUARTER FROM muh.confirmation_date) = 3 AND NOT muh.is_used) THEN 'Нет'
                ELSE NULL
                END,
            NULL
        ) AS usage_confirm_flag_q3,
        COALESCE(
            CASE
                WHEN BOOL_OR(EXTRACT(QUARTER FROM muh.confirmation_date) = 4 AND muh.is_used) THEN 'Да'
                WHEN BOOL_OR(EXTRACT(QUARTER FROM muh.confirmation_date) = 4 AND NOT muh.is_used) THEN 'Нет'
                ELSE NULL
                END,
            NULL
        ) AS usage_confirm_flag_q4
    FROM (
        SELECT
            model_id,
            confirmation_date,
            is_used,
            ROW_NUMBER() OVER (
                PARTITION BY usage_id
                ORDER BY change_date DESC
            ) AS rn
        FROM models_usage_history
        WHERE (
            :filter_date::Date IS NULL
            OR TO_DATE(CAST(:filter_date AS Varchar(4000)), 'YYYY-MM-DD')
                BETWEEN DATE_TRUNC('day', change_date)::Date
                AND DATE_TRUNC('day', change_date)::Date
        )
    ) AS muh
    WHERE muh.rn = 1
    GROUP BY muh.model_id
) AS usage_data
ON m.model_id = usage_data.usage_model_id

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
            gbl_name,
            allocation_percent,
            comment,
            ROW_NUMBER() OVER (
                PARTITION BY allocation_id, model_id
                ORDER BY change_date DESC
            ) AS rn
        FROM models_allocation_history mah
        INNER JOIN global_business_lines gbl ON mah.gbl_id = gbl.gbl_id
        WHERE (
            :filter_date::Date IS NULL
            OR TO_DATE(CAST(:filter_date AS Varchar(4000)), 'YYYY-MM-DD')
                BETWEEN DATE_TRUNC('day', change_date)::Date
                AND DATE_TRUNC('day', change_date)::Date
        )
    ) AS mah
    WHERE mah.rn = 1
    GROUP BY mah.model_id
) AS allocation_data
ON m.model_id = allocation_data.allocation_model_id

LEFT JOIN (
    SELECT
        ar.model_id                                                                AS artefacts_model_id,
        MAX(CASE WHEN artefact_id = 2000 THEN artefact_string_value ELSE NULL END) AS record_id,
        MAX(CASE WHEN artefact_id = 2001 THEN artefact_string_value ELSE NULL END) AS model_id,
        MAX(CASE WHEN artefact_id = 2002 THEN artefact_string_value ELSE NULL END) AS group_company,
        MAX(CASE WHEN artefact_id = 2003 THEN artefact_string_value ELSE NULL END) AS rating_system_name,
        MAX(CASE WHEN artefact_id = 2004 THEN artefact_string_value ELSE NULL END) AS regulatory_code_rs_pvr,
        MAX(CASE WHEN artefact_id = 2005 THEN artefact_string_value ELSE NULL END) AS description_rating_system,
        MAX(CASE WHEN artefact_id = 2006 THEN artefact_string_value ELSE NULL END) AS model_crs_code,
        MAX(CASE WHEN artefact_id = 2007 THEN artefact_string_value ELSE NULL END) AS model_type,
        MAX(CASE WHEN artefact_id = 2008 THEN artefact_string_value ELSE NULL END) AS identifier_model_algorithm_for_rwa,
        MAX(CASE WHEN artefact_id = 2009 THEN artefact_string_value ELSE NULL END) AS regulatory_code_model_pvr,
        MAX(CASE WHEN artefact_id = 2010 THEN artefact_string_value ELSE NULL END) AS internal_model_number,
        MAX(CASE WHEN artefact_id = 2011 THEN artefact_string_value ELSE NULL END) AS active_model,
        MAX(CASE WHEN artefact_id = 2012 THEN artefact_string_value ELSE NULL END) AS model_indicator,
        MAX(CASE WHEN artefact_id = 2013 THEN artefact_string_value ELSE NULL END) AS calibration_version,
        MAX(CASE WHEN artefact_id = 2014 THEN artefact_string_value ELSE NULL END) AS calibration_version,
        MAX(CASE WHEN artefact_id = 2015 THEN artefact_string_value ELSE NULL END) AS calibration_date,
        MAX(CASE WHEN artefact_id = 2016 THEN artefact_string_value ELSE NULL END) AS regulatory_code_of_asset_class,
        MAX(CASE WHEN artefact_id = 2017 THEN artefact_string_value ELSE NULL END) AS model_id_from_model_owner,
        MAX(CASE WHEN artefact_id = 2018 THEN artefact_string_value ELSE NULL END) AS classification_rs_algorithm_by_asset_classes,
        MAX(CASE WHEN artefact_id = 2019 THEN artefact_string_value ELSE NULL END) AS significance_validity,
        MAX(CASE WHEN artefact_id = 2020 THEN artefact_string_value ELSE NULL END) AS degree_of_regulatory_supervision,
        MAX(CASE WHEN artefact_id = 2021 THEN artefact_string_value ELSE NULL END) AS materiality_rate,
        MAX(CASE WHEN artefact_id = 2022 THEN artefact_string_value ELSE NULL END) AS impact_coverage,
        MAX(CASE WHEN artefact_id = 2023 THEN artefact_string_value ELSE NULL END) AS responsible_for_significance_validity,
        MAX(CASE WHEN artefact_id = 2024 THEN artefact_string_value ELSE NULL END) AS classification_of_rs_by_order_of_application_within_pvr,
        MAX(CASE WHEN artefact_id = 2025 THEN artefact_string_value ELSE NULL END) AS credit_risk_component,
        MAX(CASE WHEN artefact_id = 2026 THEN artefact_string_value ELSE NULL END) AS method_calculation_model_parameter,
        MAX(CASE WHEN artefact_id = 2027 THEN artefact_string_value ELSE NULL END) AS segment_name,
        MAX(CASE WHEN artefact_id = 2028 THEN artefact_string_value ELSE NULL END) AS implementation_segment,
        MAX(CASE WHEN artefact_id = 2029 THEN artefact_string_value ELSE NULL END) AS regulatory_class,
        MAX(CASE WHEN artefact_id = 2030 THEN artefact_string_value ELSE NULL END) AS regulatory_subclass,
        MAX(CASE WHEN artefact_id = 2031 THEN artefact_string_value ELSE NULL END) AS business_customer,
        MAX(CASE WHEN artefact_id = 2032 THEN artefact_string_value ELSE NULL END) AS business_customer_departament,
        MAX(CASE WHEN artefact_id = 2033 THEN artefact_string_value ELSE NULL END) AS goals_using_results_of_work_rs,
        MAX(CASE WHEN artefact_id = 2034 THEN artefact_string_value ELSE NULL END) AS implementation_validity,
        MAX(CASE WHEN artefact_id = 2035 THEN artefact_string_value ELSE NULL END) AS validity_approve,
        MAX(CASE WHEN artefact_id = 2036 THEN artefact_string_value ELSE NULL END) AS bank_document,
        MAX(CASE WHEN artefact_id = 2037 THEN artefact_string_value ELSE NULL END) AS remove_date,
        MAX(CASE WHEN artefact_id = 2038 THEN artefact_string_value ELSE NULL END) AS remove_decision,
        MAX(CASE WHEN artefact_id = 2039 THEN artefact_string_value ELSE NULL END) AS ds_department,
        MAX(CASE WHEN artefact_id = 2040 THEN artefact_string_value ELSE NULL END) AS developing_start_date,
        MAX(CASE WHEN artefact_id = 2041 THEN artefact_string_value ELSE NULL END) AS developing_end_date,
        MAX(CASE WHEN artefact_id = 2042 THEN artefact_string_value ELSE NULL END) AS data_source_description,
        MAX(CASE WHEN artefact_id = 2043 THEN artefact_string_value ELSE NULL END) AS target,
        MAX(CASE WHEN artefact_id = 2044 THEN artefact_string_value ELSE NULL END) AS calibration_method,
        MAX(CASE WHEN artefact_id = 2045 THEN artefact_string_value ELSE NULL END) AS analize_text_about_developing,
        MAX(CASE WHEN artefact_id = 2046 THEN artefact_string_value ELSE NULL END) AS name_and_version_rating_system,
        MAX(CASE WHEN artefact_id = 2047 THEN artefact_string_value ELSE NULL END) AS version_it_implementation,
        MAX(CASE WHEN artefact_id = 2048 THEN artefact_string_value ELSE NULL END) AS responsible_subdivision_and_project_lead_for_it_implementation,
        MAX(CASE WHEN artefact_id = 2049 THEN artefact_string_value ELSE NULL END) AS date_of_it_introduction_into_operation,
        MAX(CASE WHEN artefact_id = 2050 THEN artefact_string_value ELSE NULL END) AS psi_protocol,
        MAX(CASE WHEN artefact_id = 2051 THEN artefact_string_value ELSE NULL END) AS validation_department,
        MAX(CASE WHEN artefact_id = 2052 THEN artefact_string_value ELSE NULL END) AS plan_validation_type,
        MAX(CASE WHEN artefact_id = 2053 THEN artefact_string_value ELSE NULL END) AS validation_period,
        MAX(CASE WHEN artefact_id = 2054 THEN artefact_string_value ELSE NULL END) AS validation_report_approve_date,
        MAX(CASE WHEN artefact_id = 2055 THEN artefact_string_value ELSE NULL END) AS validation_result_approve_date,
        MAX(CASE WHEN artefact_id = 2056 THEN artefact_string_value ELSE NULL END) AS auto_validation_result,
        MAX(CASE WHEN artefact_id = 2057 THEN artefact_string_value ELSE NULL END) AS importance_changes,
        MAX(CASE WHEN artefact_id = 2058 THEN artefact_string_value ELSE NULL END) AS approve_importance,
        MAX(CASE WHEN artefact_id = 2059 THEN artefact_string_value ELSE NULL END) AS approve_importance_changes,
        MAX(CASE WHEN artefact_id = 2060 THEN artefact_string_value ELSE NULL END) AS date_and_number_regulator_notification,
        MAX(CASE WHEN artefact_id = 2061 THEN artefact_string_value ELSE NULL END) AS date_submission_to_regulator,
        MAX(CASE WHEN artefact_id = 2062 THEN artefact_string_value ELSE NULL END) AS start_date_of_application_model_approved_regulator,
        MAX(CASE WHEN artefact_id = 2063 THEN artefact_string_value ELSE NULL END) AS decision_date_of_application_model_for_segment,
        MAX(CASE WHEN artefact_id = 2064 THEN artefact_string_value ELSE NULL END) AS decision_number_of_application_model_for_segment,
        MAX(CASE WHEN artefact_id = 2065 THEN artefact_string_value ELSE NULL END) AS notification_date_of_application_model_for_segment,
        MAX(CASE WHEN artefact_id = 2066 THEN artefact_string_value ELSE NULL END) AS notification_number_of_application_model_for_segment,
        MAX(CASE WHEN artefact_id = 2067 THEN artefact_string_value ELSE NULL END) AS decision_date_of_application_model,
        MAX(CASE WHEN artefact_id = 2068 THEN artefact_string_value ELSE NULL END) AS decision_number_of_application_model,
        MAX(CASE WHEN artefact_id = 2069 THEN artefact_string_value ELSE NULL END) AS notification_date_of_application_model,
        MAX(CASE WHEN artefact_id = 2070 THEN artefact_string_value ELSE NULL END) AS notification_number_of_application_model,
        MAX(CASE WHEN artefact_id = 2071 THEN artefact_string_value ELSE NULL END) AS model_risk_type,
        MAX(CASE WHEN artefact_id = 2072 THEN artefact_string_value ELSE NULL END) AS model_changes_info,
        MAX(CASE WHEN artefact_id = 2073 THEN artefact_string_value ELSE NULL END) AS rfd,
        MAX(CASE WHEN artefact_id = 2074 THEN artefact_string_value ELSE NULL END) AS ds_stream,
        MAX(CASE WHEN artefact_id = 2075 THEN artefact_string_value ELSE NULL END) AS assignment_contractor,
        MAX(CASE WHEN artefact_id = 2076 THEN artefact_string_value ELSE NULL END) AS model_epic_04,
        MAX(CASE WHEN artefact_id = 2077 THEN artefact_string_value ELSE NULL END) AS model_epic_04_date,
        MAX(CASE WHEN artefact_id = 2078 THEN artefact_string_value ELSE NULL END) AS model_epic_05,
        MAX(CASE WHEN artefact_id = 2079 THEN artefact_string_value ELSE NULL END) AS model_epic_05a,
        MAX(CASE WHEN artefact_id = 2080 THEN artefact_string_value ELSE NULL END) AS data_completion_of_stage_05a,
        MAX(CASE WHEN artefact_id = 2081 THEN artefact_string_value ELSE NULL END) AS solution_to_implement_model,
        MAX(CASE WHEN artefact_id = 2082 THEN artefact_string_value ELSE NULL END) AS model_epic_07,
        MAX(CASE WHEN artefact_id = 2083 THEN artefact_string_value ELSE NULL END) AS model_epic_07_date,
        MAX(CASE WHEN artefact_id = 2084 THEN artefact_string_value ELSE NULL END) AS custom_model_id,
        MAX(CASE WHEN artefact_id = 2085 THEN artefact_string_value ELSE NULL END) AS custom_model_type,
        MAX(CASE WHEN artefact_id = 2086 THEN artefact_string_value ELSE NULL END) AS release,
        MAX(CASE WHEN artefact_id = 2087 THEN artefact_string_value ELSE NULL END) AS model_epic_09,
        MAX(CASE WHEN artefact_id = 2088 THEN artefact_string_value ELSE NULL END) AS model_epic_11,
        MAX(CASE WHEN artefact_id = 2089 THEN artefact_string_value ELSE NULL END) AS model_epic_11_date,
        MAX(CASE WHEN artefact_id = 2090 THEN artefact_string_value ELSE NULL END) AS model_epic_12,
        MAX(CASE WHEN artefact_id = 2091 THEN artefact_string_value ELSE NULL END) AS model_epic_12_date,
        MAX(CASE WHEN artefact_id = 2112 THEN artefact_string_value ELSE NULL END) AS date_of_introduction_into_operation,
        MAX(CASE WHEN artefact_id = 2092 THEN artefact_string_value ELSE NULL END) AS pvr,
        MAX(CASE WHEN artefact_id = 2094 THEN artefact_string_value ELSE NULL END) AS validity_approve_date,
        MAX(CASE WHEN artefact_id = 2095 THEN artefact_string_value ELSE NULL END) AS validation_result,
        MAX(CASE WHEN artefact_id = 2096 THEN artefact_string_value ELSE NULL END) AS model_name_dadm,
        MAX(CASE WHEN artefact_id = 2097 THEN artefact_string_value ELSE NULL END) AS decision_date_and_number_of_application_model_for_segment,
        MAX(CASE WHEN artefact_id = 2098 THEN artefact_string_value ELSE NULL END) AS notification_date_and_number_of_application_model_for_segment,
        MAX(CASE WHEN artefact_id = 2099 THEN artefact_string_value ELSE NULL END) AS decision_date_and_number_of_application_model,
        MAX(CASE WHEN artefact_id = 2100 THEN artefact_string_value ELSE NULL END) AS notification_date_and_number_of_application_model,
        MAX(CASE WHEN artefact_id = 2102 THEN artefact_string_value ELSE NULL END) AS model_status_assignee,
        MAX(CASE WHEN artefact_id = 2104 THEN artefact_string_value ELSE NULL END) AS developing_model_reason,
        MAX(CASE WHEN artefact_id = 2105 THEN artefact_string_value ELSE NULL END) AS product_name,
        MAX(CASE WHEN artefact_id = 2106 THEN artefact_string_value ELSE NULL END) AS provides_piloting,
        MAX(CASE WHEN artefact_id = 2107 THEN artefact_string_value ELSE NULL END) AS operational_monitoring,
        MAX(CASE WHEN artefact_id = 2108 THEN artefact_string_value ELSE NULL END) AS analytical_monitoring,
        MAX(CASE WHEN artefact_id = 2109 THEN artefact_string_value ELSE NULL END) AS business_model_risk_subtype,
        MAX(CASE WHEN artefact_id = 2110 THEN artefact_string_value ELSE NULL END) AS rating_model
    FROM (
        SELECT
            artefact_realizations_new.model_id,
            artefact_realizations_new.artefact_id,
            artefact_realizations_new.artefact_string_value,
            ROW_NUMBER() OVER (
                PARTITION BY artefact_realizations_new.model_id, artefact_realizations_new.artefact_id
                ORDER BY artefact_realizations_new.effective_from DESC
            ) AS rn
        FROM artefact_realizations_new
        WHERE (
            :filter_date::DATE IS NULL
            OR TO_DATE(CAST(:filter_date AS VARCHAR(4000)), 'YYYY-MM-DD')
                BETWEEN DATE_TRUNC('day', artefact_realizations_new.effective_from)::DATE
                AND DATE_TRUNC('day', artefact_realizations_new.effective_to)::DATE
        )
    ) ar
    WHERE ar.rn = 1
    GROUP BY ar.model_id
) AS artefact_data
ON m.model_id = artefact_data.artefacts_model_id
WHERE (
    :filter_date::DATE IS NULL
    OR TO_DATE(CAST(:filter_date AS VARCHAR(4000)), 'YYYY-MM-DD')
        BETWEEN DATE_TRUNC('day', m.create_date)::DATE
        AND DATE_TRUNC('day', NOW())::DATE
);
`;

export { getModels };
