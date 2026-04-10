-- Проверка матрицы БЕЗ изменения данных.
-- Ожидаемо: rows_in_matrix = after_artefacts = after_roles_join = distinct_pk = 71
--
-- Сверка по artefacts.artefact_tech_label (как в fix_edit_permissions_matrix_2026_04_08.sql).
-- Если after_artefacts < rows_in_matrix: в БД нет строки artefacts с таким artefact_tech_label.
-- Второй блок результата (result_kind = missing_tech): DISTINCT tech без строки в artefacts.
-- Сверка с Pravila redaktirovaniia atributov v SURM dlia TkIS (2).csv: колонки ролей A/B = СУМ/СУРМ.
-- DBeaver: схема mrms — выполнить весь файл (Ctrl+Enter «скриптом» или выделить всё и Execute).
SET search_path TO mrms, public;

WITH am(role_name, model_source, artefact_tech_label) AS (
  SELECT * FROM (VALUES
    ('business_customer', 'sum_rm', 'operational_control_date'),
    ('business_customer', 'sum_rm', 'analytical_control_date'),
    ('business_customer', 'sum_rm', 'model_values_control_date'),
    ('business_customer', 'sum_rm', 'impact_assessment_date'),
    ('business_customer', 'sum_rm', 'model_data_07k_control_epic'),
    ('business_customer', 'sum_rm', 'check_objects_count'),
    ('business_customer', 'sum_rm', 'operational_control_epic'),
    ('business_customer', 'sum_rm', 'analytical_control_epic'),
    ('business_customer', 'sum_rm', 'model_values_control_epic'),
    ('business_customer', 'sum_rm', 'impact_assessment_epic'),
    ('business_customer', 'sum_rm', 'model_data_07k_control'),
    ('business_customer', 'sum_rm', 'model_data_control_date'),
    ('business_customer', 'sum', 'implementation_segment'),
    ('business_customer', 'sum_rm', 'implementation_segment'),
    ('business_customer', 'sum', 'remove_decision'),
    ('business_customer', 'sum', 'operational_control_date'),
    ('business_customer', 'sum', 'analytical_control_date'),
    ('business_customer', 'sum', 'model_values_control_date'),
    ('business_customer', 'sum', 'impact_assessment_date'),
    ('business_customer', 'sum', 'model_data_07k_control_epic'),
    ('business_customer', 'sum', 'check_objects_count'),
    ('business_customer', 'sum', 'segment_name'),
    ('business_customer', 'sum_rm', 'segment_name'),
    ('business_customer', 'sum', 'operational_control_epic'),
    ('business_customer', 'sum', 'analytical_control_epic'),
    ('business_customer', 'sum', 'model_values_control_epic'),
    ('business_customer', 'sum', 'impact_assessment_epic'),
    ('business_customer', 'sum', 'model_data_07k_control'),
    ('business_customer', 'sum', 'model_data_control_date'),
    ('business_customer', 'sum', 'ds_department'),
    ('business_customer', 'sum', 'rating_model'),
    ('business_customer', 'sum_rm', 'ds_department'),
    ('business_customer', 'sum_rm', 'developing_report'),
    ('business_customer', 'sum_rm', 'rating_model'),
    ('business_customer', 'sum_rm', 'developing_end_date'),
    ('business_customer', 'sum', 'remove_date_validation'),
    ('business_customer', 'sum_rm', 'remove_date_validation'),
    ('business_customer', 'sum_rm', 'remove_decision'),
    ('validator_lead', 'sum', 'implementation_segment'),
    ('validator_lead', 'sum_rm', 'implementation_segment'),
    ('validator_lead', 'sum', 'remove_decision'),
    ('validator_lead', 'sum_rm', 'remove_decision'),
    ('validator_lead', 'sum', 'segment_name'),
    ('validator_lead', 'sum_rm', 'segment_name'),
    ('validator_lead', 'sum', 'validation_report_approve_date'),
    ('validator_lead', 'sum_rm', 'validation_report_approve_date'),
    ('validator_lead', 'sum', 'remove_date_validation'),
    ('validator_lead', 'sum_rm', 'remove_date_validation'),
    ('ds_lead', 'sum', 'model_epic_04_date'),
    ('ds_lead', 'sum', 'model_epic_05a'),
    ('ds_lead', 'sum', 'model_epic_07'),
    ('ds_lead', 'sum', 'customer_model_id'),
    ('ds_lead', 'sum', 'model_epic_09'),
    ('ds_lead', 'sum', 'model_epic_11_date'),
    ('ds_lead', 'sum', 'output_table'),
    ('ds_lead', 'sum', 'allocation_assessment_parameters'),
    ('ds_lead', 'sum', 'runtime_subsystem'),
    ('ds_lead', 'sum', 'developing_end_date'),
    ('ds_lead', 'sum', 'rs_model_decommiss_date'),
    ('ds_lead', 'sum', 'developing_start_date'),
    ('ds_lead', 'sum', 'model_epic_04'),
    ('ds_lead', 'sum', 'model_epic_05'),
    ('ds_lead', 'sum', 'data_completion_of_stage_05a'),
    ('ds_lead', 'sum', 'model_epic_07_date'),
    ('ds_lead', 'sum', 'release'),
    ('ds_lead', 'sum', 'model_epic_11'),
    ('ds_lead', 'sum', 'date_of_introduction_into_operation'),
    ('ds_lead', 'sum', 'allocation_assessment_class'),
    ('ds_lead', 'sum', 'deploy_team'),
    ('ds_lead', 'sum', 'buiseness_process_name'),
    ('ds_lead', 'sum', 'deploy_system')
  ) AS v(role_name, model_source, artefact_tech_label)
),
j AS (
  SELECT a.artefact_id, am.model_source, r.role_id
  FROM am
  INNER JOIN artefacts AS a ON a.artefact_tech_label = am.artefact_tech_label
  INNER JOIN roles AS r ON r.role_name = am.role_name
)
SELECT *
FROM (
  SELECT
    'summary'::text AS result_kind,
    NULL::text AS missing_matrix_artefact_tech,
    (SELECT COUNT(*) FROM am) AS rows_in_matrix,
    (SELECT COUNT(*) FROM am INNER JOIN artefacts a ON a.artefact_tech_label = am.artefact_tech_label) AS after_artefacts,
    (SELECT COUNT(*) FROM j) AS after_roles_join,
    (SELECT COUNT(*) FROM (SELECT DISTINCT artefact_id, model_source, role_id FROM j) d) AS distinct_pk
  UNION ALL
  SELECT
    'missing_tech'::text,
    m.artefact_tech_label,
    NULL::bigint,
    NULL::bigint,
    NULL::bigint,
    NULL::bigint
  FROM (
    SELECT DISTINCT am.artefact_tech_label
    FROM am
    LEFT JOIN artefacts a ON a.artefact_tech_label = am.artefact_tech_label
    WHERE a.artefact_id IS NULL
  ) AS m(artefact_tech_label)
) AS u
ORDER BY CASE WHEN u.result_kind = 'summary' THEN 0 ELSE 1 END, u.missing_matrix_artefact_tech NULLS LAST;
