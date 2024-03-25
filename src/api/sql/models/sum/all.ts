const sql = `
/*
Запрос для отчета "Список моделей"
*/
select
  m_.model_id as system_model_id,
  'sum' as model_source,
  m_.model_id as model_version_id,
  cast('model' || m_.root_model_id as varchar(4000)) || '-v' ||
    cast(m_.model_version as varchar(4000)) as model_id,
  clsf_.group_company,
  m_.model_name,
  m_.model_desc,
  m_.update_date,
  clsf_.model_type,
  m_.model_version,
  'Нет данных' as model_indicator,
  'Нет данных' as calibration_version,
  'Нет данных' as calibration_date,
  cast('model' || m_.root_model_id as varchar(4000)) || '-v' ||
    cast(m_.model_version as varchar(4000)) as model_alias,
  dm_.significance_validity,
  dm_.segment_name,
  dm_.implementation_segment,
  dm_.business_customer,
  clsf_.CUSTOMER_DEPT as business_customer_departament,
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
  m_.model_id as uuid,
  dm_.DS_DEPARTMENT as ds_stream,
  'Нет данных' as assignment_contractor,
  dm_.solution_to_implement_model,
  'Нет данных' as model_status,
  'Нет данных' as model_status_assignee
from
  models m_
  left join (
    select
      ar_.model_id,
      STRING_AGG(
        (case when ar_.artefact_id = 173 then av_.artefact_value else null end)::varchar,
        ' > ' ORDER BY
          ar_.artefact_value_id
      ) AS model_type,
      STRING_AGG(
        (case when ar_.artefact_id = 57 then av_.artefact_value_id else null end)::varchar,
        ',' ORDER BY
          ar_.artefact_value_id
      ) AS product_and_scope_id,
      STRING_AGG(
        (case when ar_.artefact_id = 73 then av_.artefact_value else null end)::varchar,
        ' > ' ORDER BY
          ar_.artefact_value_id
      ) AS group_company,
      MAX(
        CASE WHEN ar_.ARTEFACT_ID = 6 THEN ARTEFACT_VALUE ELSE NULL END
      ) AS CUSTOMER_DEPT
    from
      artefact_realizations ar_
      inner join artefact_values av_ on ar_.artefact_value_id = av_.artefact_value_id
      and av_.is_active_flg = '1'
    where
      ar_.artefact_id in (173, 6, 67, 73)
      and ar_.effective_to = TO_TIMESTAMP(
        '9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS'
      )
    group by
      ar_.model_id
  ) clsf_ on m_.model_id = clsf_.model_id
  left join (
    select
      model_id,
      max(
        case when artefact_id = 58 then artefact_string_value else null end
      ) as segment_name,
      MAX(
        CASE WHEN ARTEFACT_ID = 7 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS DS_DEPARTMENT,
      MAX(
        CASE WHEN ARTEFACT_ID = 67 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS significance_validity,
      MAX(
        CASE WHEN ARTEFACT_ID = 782 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS model_is_used,
      MAX(
        CASE WHEN ARTEFACT_ID = 783 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS implementation_decision,
      MAX(
        CASE WHEN ARTEFACT_ID = 785 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS implementation_segment,
      MAX(
        CASE WHEN ARTEFACT_ID = 309 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS business_customer,
      MAX(
        CASE WHEN ARTEFACT_ID = 786 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS implementation_validity,
      MAX(
        CASE WHEN ARTEFACT_ID = 787 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS validity_approve,
      MAX(
        CASE WHEN ARTEFACT_ID = 788 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS validity_approve_date,
      MAX(
        CASE WHEN ARTEFACT_ID = 789 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS remove_decision,
      MAX(
        CASE WHEN ARTEFACT_ID = 33 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS developing_start_date,
      MAX(
        CASE WHEN ARTEFACT_ID = 34 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS developing_end_date,
      MAX(
        CASE WHEN ARTEFACT_ID = 103 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS data_source_description,
      MAX(
        CASE WHEN ARTEFACT_ID = 277 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS target,
      MAX(
        CASE WHEN ARTEFACT_ID = 249 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS analize_text_about_developing,
      MAX(
        CASE WHEN ARTEFACT_ID = 346 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS psi_protocol,
      MAX(
        CASE WHEN ARTEFACT_ID = 790 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS validation_department,
      MAX(
        CASE WHEN ARTEFACT_ID = 791 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS validation_period,
      MAX(
        CASE WHEN ARTEFACT_ID = 507 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS validation_result,
      MAX(
        CASE WHEN ARTEFACT_ID = 792 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS validation_report_approve_date,
      MAX(
        CASE WHEN ARTEFACT_ID = 793 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS validation_result_approve_date,
      MAX(
        CASE WHEN ARTEFACT_ID = 256 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS auto_validation_result,
      MAX(
        CASE WHEN ARTEFACT_ID = 794 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS importance_changes,
      MAX(
        CASE WHEN ARTEFACT_ID = 795 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS approve_importance,
      MAX(
        CASE WHEN ARTEFACT_ID = 796 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS approve_importance_changes,
      MAX(
        CASE WHEN ARTEFACT_ID = 797 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS model_risk_type,
      MAX(
        CASE WHEN ARTEFACT_ID = 798 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS model_changes_info,
      MAX(
        CASE WHEN ARTEFACT_ID = 123 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS solution_to_implement_model
    from
      artefact_realizations
    where
      effective_to = TO_TIMESTAMP(
        '9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS'
      )
      and artefact_id in (7, 58, 67, 782, 783, 785, 309, 786, 787,
                          788, 789, 33, 34, 103, 277, 249, 346, 790, 791, 788,
                          507, 792, 793, 256, 794, 795, 796, 797, 798, 123)
    group by
      model_id
  ) dm_ on m_.model_id = dm_.model_id
where m_.MODELS_IS_ACTIVE_FLG = '1' and m_.MODEL_DESC != 'AutoML'

`;

export { sql };
