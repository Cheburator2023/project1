-- fix_edit_permissions_matrix_2026_04_08.sql
--
-- Одним прогоном: довести roles (при необходимости), затем artefact_source_roles до целевой матрицы прав.
-- DevOps: выполнить файл целиком в целевой БД/схеме. Повторный запуск безопасен (ON CONFLICT DO NOTHING).
-- Ключ в artefacts — artefact_tech_label; гранты вешаются на каждый artefact_id с этим label (в т.ч. developing_end_date = 2041 из liquibase).
--
-- Порядок: INSERT недостающих ролей → DELETE старых грантов по списку полей → INSERT матрицы
-- → догрузка business_customer для developing_end_date и remove_date_validation (JOIN artefacts, без фиксированного artefact_id)
-- → hotfix DELETE для business_customer (эпики на RM) и ds_lead (только SUM) → проверочные SELECT в конце.
--
-- В конце — только чтение (счётчики, аудит, key_checks). Можно не выполнять в CI, если инструмент не поддерживает несколько результатов.
-- Если схема не mrms — изменить SET search_path ниже.
-- Если INSERT INTO roles падает из‑за обязательных колонок: на стенде другая схема roles — согласовать миграцию с DBA (не отдельный ручной SQL в приложении).

SET search_path TO mrms, public;

INSERT INTO roles (role_name)
SELECT x.role_name
FROM (
  VALUES
    ('business_customer'::text),
    ('validator_lead'::text),
    ('ds_lead'::text)
) AS x(role_name)
WHERE NOT EXISTS (
  SELECT 1 FROM roles r WHERE r.role_name = x.role_name
);

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
    ('business_customer', 'sum', 'developing_end_date'),
    ('business_customer', 'sum', 'remove_date_validation'),
    ('business_customer', 'sum_rm', 'remove_date_validation'),
    ('business_customer', 'sum_rm', 'remove_decision'),
    ('business_customer', 'sum', 'model_desc'),
    ('business_customer', 'sum_rm', 'model_desc'),
    ('business_customer', 'sum_rm', 'developing_start_date'),
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
    ('validator_lead', 'sum', 'ds_department'),
    ('validator_lead', 'sum_rm', 'ds_department'),
    ('validator_lead', 'sum_rm', 'developing_report'),
    ('validator_lead', 'sum', 'rating_model'),
    ('validator_lead', 'sum_rm', 'rating_model'),
    ('validator_lead', 'sum', 'model_desc'),
    ('validator_lead', 'sum_rm', 'model_desc'),
    ('validator_lead', 'sum_rm', 'developing_end_date'),
    ('validator_lead', 'sum_rm', 'developing_start_date'),
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
    ('ds_lead', 'sum', 'deploy_system'),
    ('ds_lead', 'sum', 'model_desc'),
    ('ds_lead', 'sum', 'model_epic_12'),
    ('ds_lead', 'sum', 'model_epic_12_date')
) AS am(role_name, model_source, artefact_tech_label)
JOIN artefacts AS a ON a.artefact_tech_label = am.artefact_tech_label
JOIN roles AS r ON r.role_name = am.role_name
ON CONFLICT (artefact_id, role_id, model_source) DO NOTHING;

-- Догрузка business_customer для developing_end_date и remove_date_validation: все строки artefacts с этим label
-- × sum, sum_rm, rm, sum-rm (дубли с основным INSERT гасятся ON CONFLICT). Бэкенд rm/sum-rm сводит к одному bucket.
INSERT INTO artefact_source_roles (artefact_id, model_source, role_id)
SELECT a.artefact_id, ms.model_source, r.role_id
FROM artefacts a
INNER JOIN roles r ON r.role_name = 'business_customer'
CROSS JOIN (
  VALUES
    ('sum'::text),
    ('sum_rm'::text),
    ('rm'::text),
    ('sum-rm'::text)
) AS ms(model_source)
WHERE a.artefact_tech_label IN ('developing_end_date', 'remove_date_validation')
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
      'model_epic_12_date',
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

-- =============================================================================
-- ПРОВЕРКИ (только SELECT; данные не меняют). Выполняются после миграции выше.
-- Проверка 1: rows_in_matrix = after_artefacts = after_roles_join = distinct_pk = 87;
--             блок missing_tech должен быть пуст (все tech из матрицы есть в artefacts).
-- Проверка 2: пустой результат — нет tech из миграции без строки в artefacts и нет дубликатов tech.
-- Проверка 3: ключевые поля (см. key_checks) — для каждой роли есть ожидаемый грант в sum / «RM»-bucket
--             и у артефакта is_edit_flg = '1'. Иначе строки missing_role_grant / artefact_not_editable.
-- Соответствие сценариям теста (подпись UI → artefact_tech_label):
--   RM + business_customer: developing_end_date, remove_date_validation (нужны sum и sum_rm в матрице).
--   SUM + business_customer: implementation_segment, remove_decision, segment_name.
--   SUM + validator_lead: те же + validation_report_approve_date.
--   SUM + ds_lead: эпики/даты из key_checks ds_lead — только bucket sum; на RM у ds_lead эти поля должны быть сняты (DELETE выше).
-- Проверка 4: в roles есть business_customer, validator_lead, ds_lead — иначе missing_role_definition.
-- Пустые результаты у 2–4 при отсутствии ошибок — ожидаемо. В конце — всегда одна строка script_status (контроль «скрипт дошёл до конца»).
-- =============================================================================

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
    ('business_customer', 'sum_rm', 'implementation_segment'),
    ('business_customer', 'sum_rm', 'segment_name'),
    ('business_customer', 'sum_rm', 'ds_department'),
    ('business_customer', 'sum_rm', 'developing_report'),
    ('business_customer', 'sum_rm', 'rating_model'),
    ('business_customer', 'sum_rm', 'developing_end_date'),
    ('business_customer', 'sum_rm', 'remove_date_validation'),
    ('business_customer', 'sum_rm', 'remove_decision'),
    ('business_customer', 'sum_rm', 'model_desc'),
    ('business_customer', 'sum_rm', 'developing_start_date'),
    ('business_customer', 'sum', 'implementation_segment'),
    ('business_customer', 'sum', 'remove_decision'),
    ('business_customer', 'sum', 'operational_control_date'),
    ('business_customer', 'sum', 'analytical_control_date'),
    ('business_customer', 'sum', 'model_values_control_date'),
    ('business_customer', 'sum', 'impact_assessment_date'),
    ('business_customer', 'sum', 'model_data_07k_control_epic'),
    ('business_customer', 'sum', 'check_objects_count'),
    ('business_customer', 'sum', 'segment_name'),
    ('business_customer', 'sum', 'operational_control_epic'),
    ('business_customer', 'sum', 'analytical_control_epic'),
    ('business_customer', 'sum', 'model_values_control_epic'),
    ('business_customer', 'sum', 'impact_assessment_epic'),
    ('business_customer', 'sum', 'model_data_07k_control'),
    ('business_customer', 'sum', 'model_data_control_date'),
    ('business_customer', 'sum', 'ds_department'),
    ('business_customer', 'sum', 'rating_model'),
    ('business_customer', 'sum', 'remove_date_validation'),
    ('business_customer', 'sum', 'developing_end_date'),
    ('business_customer', 'sum', 'model_desc'),
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
    ('validator_lead', 'sum', 'ds_department'),
    ('validator_lead', 'sum_rm', 'ds_department'),
    ('validator_lead', 'sum_rm', 'developing_report'),
    ('validator_lead', 'sum', 'rating_model'),
    ('validator_lead', 'sum_rm', 'rating_model'),
    ('validator_lead', 'sum', 'model_desc'),
    ('validator_lead', 'sum_rm', 'model_desc'),
    ('validator_lead', 'sum_rm', 'developing_end_date'),
    ('validator_lead', 'sum_rm', 'developing_start_date'),
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
    ('ds_lead', 'sum', 'deploy_system'),
    ('ds_lead', 'sum', 'model_desc'),
    ('ds_lead', 'sum', 'model_epic_12'),
    ('ds_lead', 'sum', 'model_epic_12_date')
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

WITH key_checks(role_name, artefact_tech_label, expected_bucket) AS (
  SELECT * FROM (VALUES
    ('business_customer', 'developing_end_date', 'sum'::text),
    ('business_customer', 'developing_end_date', 'sum_rm'),
    ('business_customer', 'remove_date_validation', 'sum'),
    ('business_customer', 'remove_date_validation', 'sum_rm'),
    ('business_customer', 'implementation_segment', 'sum'),
    ('business_customer', 'implementation_segment', 'sum_rm'),
    ('business_customer', 'remove_decision', 'sum'),
    ('business_customer', 'segment_name', 'sum'),
    ('business_customer', 'segment_name', 'sum_rm'),
    ('validator_lead', 'implementation_segment', 'sum'),
    ('validator_lead', 'implementation_segment', 'sum_rm'),
    ('validator_lead', 'remove_decision', 'sum'),
    ('validator_lead', 'remove_decision', 'sum_rm'),
    ('validator_lead', 'segment_name', 'sum'),
    ('validator_lead', 'segment_name', 'sum_rm'),
    ('validator_lead', 'validation_report_approve_date', 'sum'),
    ('validator_lead', 'validation_report_approve_date', 'sum_rm'),
    ('validator_lead', 'remove_date_validation', 'sum'),
    ('validator_lead', 'remove_date_validation', 'sum_rm'),
    ('validator_lead', 'developing_end_date', 'sum_rm'),
    ('validator_lead', 'developing_start_date', 'sum_rm'),
    ('ds_lead', 'model_epic_04_date', 'sum'),
    ('ds_lead', 'model_epic_05a', 'sum'),
    ('ds_lead', 'model_epic_07', 'sum'),
    ('ds_lead', 'customer_model_id', 'sum'),
    ('ds_lead', 'model_epic_09', 'sum'),
    ('ds_lead', 'model_epic_11_date', 'sum'),
    ('ds_lead', 'output_table', 'sum'),
    ('ds_lead', 'allocation_assessment_parameters', 'sum'),
    ('ds_lead', 'runtime_subsystem', 'sum'),
    ('ds_lead', 'developing_end_date', 'sum'),
    ('ds_lead', 'rs_model_decommiss_date', 'sum'),
    ('ds_lead', 'developing_start_date', 'sum'),
    ('ds_lead', 'model_epic_04', 'sum'),
    ('ds_lead', 'model_epic_05', 'sum'),
    ('ds_lead', 'data_completion_of_stage_05a', 'sum'),
    ('ds_lead', 'model_epic_07_date', 'sum'),
    ('ds_lead', 'release', 'sum'),
    ('ds_lead', 'model_epic_11', 'sum'),
    ('ds_lead', 'date_of_introduction_into_operation', 'sum'),
    ('ds_lead', 'allocation_assessment_class', 'sum'),
    ('ds_lead', 'deploy_team', 'sum'),
    ('ds_lead', 'buiseness_process_name', 'sum'),
    ('ds_lead', 'deploy_system', 'sum'),
    ('ds_lead', 'model_desc', 'sum'),
    ('ds_lead', 'model_epic_12', 'sum'),
    ('ds_lead', 'model_epic_12_date', 'sum')
  ) AS v(role_name, artefact_tech_label, expected_bucket)
),
missing_grants AS (
  SELECT
    'missing_role_grant'::text AS check_id,
    (k.role_name || ' / ' || k.artefact_tech_label
      || ' / expect ' || k.expected_bucket)::text AS detail
  FROM key_checks k
  WHERE NOT EXISTS (
    SELECT 1
    FROM artefacts a
    INNER JOIN roles r ON r.role_name = k.role_name
    INNER JOIN artefact_source_roles asr
      ON asr.artefact_id = a.artefact_id AND asr.role_id = r.role_id
    WHERE a.artefact_tech_label = k.artefact_tech_label
      AND (
        (k.expected_bucket = 'sum' AND lower(trim(asr.model_source::text)) = 'sum')
        OR (
          k.expected_bucket = 'sum_rm'
          AND lower(trim(asr.model_source::text)) IN ('sum_rm', 'rm', 'sum-rm')
        )
      )
  )
),
bad_edit_flags AS (
  SELECT
    'artefact_not_editable'::text AS check_id,
    (a.artefact_tech_label || ' is_edit_flg=' || COALESCE(a.is_edit_flg::text, 'NULL'))::text AS detail
  FROM artefacts a
  WHERE a.artefact_tech_label IN (SELECT DISTINCT artefact_tech_label FROM key_checks)
    AND COALESCE(a.is_edit_flg, '0') <> '1'
)
SELECT check_id, detail FROM missing_grants
UNION ALL
SELECT check_id, detail FROM bad_edit_flags
ORDER BY check_id, detail;

SELECT 'missing_role_definition'::text AS check_id, x.role_name::text AS detail
FROM (
  VALUES
    ('business_customer'::text),
    ('validator_lead'::text),
    ('ds_lead'::text)
) AS x(role_name)
WHERE NOT EXISTS (
  SELECT 1 FROM roles r WHERE r.role_name = x.role_name
)
ORDER BY detail;

-- Пустой результат у проверок 2–4 — норма (значит нарушений нет). Проверка 1 всегда даёт одну строку summary.
-- Если клиент показывает только последний результат — пролистайте вкладки результатов или выполняйте блоки по отдельности.
SELECT
  'fix_edit_permissions_matrix_2026_04_08_finished'::text AS script_status,
  (SELECT COUNT(*) FROM artefact_source_roles)::bigint AS artefact_source_roles_rows,
  NOW() AS finished_at;
