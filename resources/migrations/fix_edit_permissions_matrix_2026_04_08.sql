
-- Проверка чисел JOIN без INSERT: fix_edit_permissions_matrix_2026_04_08_verify_counts.sql
--
-- Матрица сопоставляется с artefacts по artefact_tech_label (стабильный ключ), не по русской подписи.
--
-- Без временных таблиц — чтобы SQL-валидаторы/линтеры не ругались на «table not found».
--
-- ON CONFLICT: повторный запуск / гонка / строка не удалена первым шагом — без ошибки 23505.
--
-- Первый DELETE: ts включает rm / sum-rm — иначе строки с model_source=rm не сбрасываются,
-- остаётся лишний ds_lead на RM и «пропадают» гранты business_customer на даты.

DELETE FROM artefact_source_roles AS asr
WHERE EXISTS (
  SELECT 1
  FROM artefacts AS a
  INNER JOIN (
    VALUES
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
  ) AS lf(artefact_tech_label) ON lf.artefact_tech_label = a.artefact_tech_label
  INNER JOIN roles AS r ON r.role_name IN (
    'business_customer',
    'ds_lead',
    'validator_lead'
  )
  CROSS JOIN (
    VALUES
      ('sum'::text),
      ('sum_rm'::text),
      ('rm'::text),
      ('sum-rm'::text)
  ) AS ts(model_source)
  WHERE asr.artefact_id = a.artefact_id
    AND asr.role_id = r.role_id
    AND asr.model_source = ts.model_source
);

INSERT INTO artefact_source_roles (artefact_id, model_source, role_id)
SELECT DISTINCT
  a.artefact_id,
  am.model_source,
  r.role_id
FROM (
  VALUES
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
) AS am(role_name, model_source, artefact_tech_label)
JOIN artefacts AS a ON a.artefact_tech_label = am.artefact_tech_label
JOIN roles AS r ON r.role_name = am.role_name
ON CONFLICT (artefact_id, role_id, model_source) DO NOTHING;

-- ------------------------------------------------------------------
-- Hotfix: guarantee rm/sum-rm deny for business customer epic fields.
-- developing_end_date / remove_date_validation intentionally excluded:
-- business customer must edit these on RM (decommission / dev end date).
-- Context: some stands may keep stale rows with is_editable=1 for rm.
-- This block is idempotent and safe for repeated runs.
-- ------------------------------------------------------------------
WITH target_fields AS (
  SELECT unnest(
    ARRAY[
      'model_epic_04',
      'model_epic_04_date',
      'model_epic_05',
      'model_epic_05a',
      'model_epic_05_date',
      'model_epic_07',
      'model_epic_07_date',
      'release',
      'model_epic_09',
      'model_epic_11',
      'model_epic_11_date',
      'model_epic_12',
      'model_epic_12_date',
      'date_of_introduction_into_operation',
      'data_completion_of_stage_05a',
      'customer_model_id'
    ]::text[]
  ) AS artefact_tech_label
),
target_roles AS (
  SELECT role_id
  FROM roles
  WHERE role_name = 'business_customer'
)
DELETE FROM artefact_source_roles AS asr
USING artefacts AS a, target_fields AS tf, target_roles AS tr
WHERE asr.artefact_id = a.artefact_id
  AND asr.role_id = tr.role_id
  AND a.artefact_tech_label = tf.artefact_tech_label
  AND asr.model_source IN ('sum_rm', 'sum-rm', 'rm');

-- ------------------------------------------------------------------
-- Final safeguard for stands where 3 fields can be reintroduced by
-- previous rules. Keep this at the very end.
-- ------------------------------------------------------------------
DELETE FROM artefact_source_roles AS asr
WHERE asr.artefact_id IN (
  SELECT a.artefact_id
  FROM artefacts AS a
  WHERE a.artefact_tech_label IN (
    'customer_model_id',
    'data_completion_of_stage_05a',
    'date_of_introduction_into_operation'
  )
)
AND asr.role_id IN (
  SELECT r.role_id
  FROM roles AS r
  WHERE r.role_name = 'business_customer'
)
AND asr.model_source IN ('sum_rm', 'sum-rm', 'rm');

-- ------------------------------------------------------------------
-- ds_lead: права только на SUM; снять любые строки на RM (в т.ч. после старых данных).
-- ------------------------------------------------------------------
DELETE FROM artefact_source_roles AS asr
WHERE asr.role_id IN (
    SELECT role_id FROM roles WHERE role_name = 'ds_lead'
  )
  AND asr.model_source IN ('sum_rm', 'sum-rm', 'rm')
  AND asr.artefact_id IN (
    SELECT a.artefact_id
    FROM artefacts AS a
    WHERE a.artefact_tech_label IN (
      'model_epic_04_date',
      'model_epic_05a',
      'model_epic_07',
      'customer_model_id',
      'model_epic_09',
      'model_epic_11_date',
      'output_table',
      'allocation_assessment_parameters',
      'dev_team',
      'runtime_subsystem',
      'model_desc',
      'model_epic_04',
      'model_epic_05',
      'data_completion_of_stage_05a',
      'model_epic_07_date',
      'release',
      'model_epic_11',
      'model_epic_12',
      'date_of_introduction_into_operation',
      'allocation_assessment_class',
      'project_ref',
      'deploy_team',
      'buiseness_process_name',
      'developing_end_date',
      'rs_model_decommiss_date',
      'developing_start_date',
      'deploy_system'
    )
  );

-- ------------------------------------------------------------------
-- Post-check (run manually after migration):
-- Expected: 0 rows for business_customer on rm
-- for the epic / pilot fields above — not for developing_end_date or
-- remove_date_validation (those should remain granted on RM).
-- ------------------------------------------------------------------
