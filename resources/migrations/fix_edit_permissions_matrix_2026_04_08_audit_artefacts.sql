-- Аудит по artefact_tech_label (канон для матрицы и API). artefact_label не сравнивается.
-- Запуск вручную (DBeaver и т.п.); данные не меняет.
--
--   q1_matrix_tech_missing — tech из миграции fix_edit_permissions_matrix без строки в artefacts
--   q2_duplicate_tech      — одинаковый artefact_tech_label у нескольких artefact_id (аномалия)
SET search_path TO mrms, public;

WITH migration_matrix_tech(artefact_tech_label) AS (
  SELECT * FROM (VALUES
    ('model_epic_04_date'),
    ('model_epic_05a'),
    ('model_epic_07'),
    ('customer_model_id'),
    ('model_epic_09'),
    ('model_epic_11_date'),
    ('model_epic_12_date'),
    ('operational_control_date'),
    ('analytical_control_date'),
    ('model_values_control_date'),
    ('impact_assessment_date'),
    ('model_data_07k_control_epic'),
    ('check_objects_count'),
    ('model_epic_04'),
    ('model_epic_05'),
    ('data_completion_of_stage_05a'),
    ('model_epic_07_date'),
    ('release'),
    ('model_epic_11'),
    ('model_epic_12'),
    ('date_of_introduction_into_operation'),
    ('operational_control_epic'),
    ('analytical_control_epic'),
    ('model_values_control_epic'),
    ('impact_assessment_epic'),
    ('model_data_07k_control'),
    ('model_data_control_date'),
    ('implementation_segment'),
    ('remove_decision'),
    ('segment_name'),
    ('validation_report_approve_date'),
    ('remove_date_validation'),
    ('ds_department'),
    ('developing_report'),
    ('rating_model'),
    ('output_table'),
    ('allocation_assessment_parameters'),
    ('dev_team'),
    ('runtime_subsystem'),
    ('model_desc'),
    ('allocation_assessment_class'),
    ('project_ref'),
    ('deploy_team'),
    ('buiseness_process_name'),
    ('developing_end_date'),
    ('rs_model_decommiss_date'),
    ('developing_start_date'),
    ('deploy_system')
  ) AS m(artefact_tech_label)
),
q1_matrix_tech_missing AS (
  SELECT
    'q1_matrix_tech_missing'::text AS check_id,
    mt.artefact_tech_label::text AS detail
  FROM migration_matrix_tech mt
  LEFT JOIN artefacts a ON a.artefact_tech_label = mt.artefact_tech_label
  WHERE a.artefact_id IS NULL
),
q2_duplicate_tech AS (
  SELECT
    'q2_duplicate_tech'::text AS check_id,
    a.artefact_tech_label::text AS detail
  FROM artefacts a
  GROUP BY a.artefact_tech_label
  HAVING COUNT(*) > 1
)
SELECT check_id, detail FROM q1_matrix_tech_missing
UNION ALL
SELECT check_id, detail FROM q2_duplicate_tech
ORDER BY check_id, detail;
