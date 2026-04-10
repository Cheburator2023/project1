-- Идемпотентный ремонт матрицы artefact_source_roles без «полного обнуления» первого
-- DELETE из fix_edit_permissions_matrix_2026_04_08.sql (который снимает все источники).
--
-- Сопоставление подписей UI → artefact_tech_label (InitialCollumns name) по обратной связи:
--
-- business_customer (пользователь без префикса test_ — та же роль Keycloak):
--   developing_end_date              — «Дата окончания разработки Модели»
--   remove_date_validation          — «Дата выведения РС / Модели из эксплуатации» (нужен grant на RM: sum_rm/rm)
--   implementation_segment         — «Сегмент применения Модели / Рейтинговой системы / Алгоритма» (SUM: sum)
--   remove_decision                — «Реквизиты решения о выведении из эксплуатации» (SUM: sum)
--   segment_name                   — «Целевой сегмент Модели / Алгоритма» (SUM: sum; RM: sum_rm в матрице)
--
-- validator_lead:
--   те же три поля, что у business_customer для сценария SUM, плюс
--   validation_report_approve_date — «Дата утверждения отчета валидации»
--
-- ds_lead (редактирование эпиков — только SUM; на RM строки удаляются блоком DELETE ниже):
--   model_epic_04_date             — «Дата решения 04»
--   model_epic_05a                 — «Этап 05А»
--   model_epic_07                  — «Этап 07»
--   customer_model_id              — «CustomModelId»
--   model_epic_09                  — «Эпик 09»
--   model_epic_11_date             — «Дата решения для эпика 11»
--   output_table                   — «Выходная таблица»
--   allocation_assessment_parameters — «Параметры оценки аллокаций»
--   runtime_subsystem              — «Подсистема реализации модели»
--   developing_end_date            — «Дата окончания разработки Модели»
--   rs_model_decommiss_date        — «Дата выведения Модели из ПИМ»
--   developing_start_date          — «Дата начала разработки Модели»
--   model_epic_04                  — «Этап 04»
--   model_epic_05                  — «Модельный эпик 05»
--   data_completion_of_stage_05a   — «Дата завершения разработки пилота»
--   model_epic_07_date             — «Дата решения для 07 этапа»
--   release                        — «Релиз»
--   model_epic_11                  — «Эпик 11»
--   date_of_introduction_into_operation — «Дата релиза»
--   allocation_assessment_class    — «Класс оценки аллокаций»
--   deploy_team                    — «Команда, которая внедряла модель»
--   buiseness_process_name         — «Бизнес-процесс»
--   deploy_system                  — «Система внедрения»
--   model_epic_12                  — «Этап 12»
--   model_epic_12_date             — «Дата решения для эпика 12»
--   model_desc                     — «Описание модели»
--   dev_team                       — «Название команды, ответственной за разработку»
--   project_ref                    — «Проект, в рамках которого реализуется задача по построению модели»
--
-- Назначение:
-- 1) Добавить недостающие строки матрицы (INSERT … ON CONFLICT DO NOTHING) — 86 ожидаемых пар
--    role × model_source × artefact (см. fix_edit_permissions_matrix_2026_04_08_verify_counts.sql).
-- 2) Снять ds_lead с RM (sum_rm / rm / sum-rm) по полям, где по требованиям редактирование только на SUM.
-- 3) Снять business_customer с RM по «эпик»-полям, оставив developing_end_date и remove_date_validation.
-- 4) Страховочный DELETE для трёх полей, которые не должны быть у BC на RM.
--
-- Роли в Keycloak / приложении (без префикса test_): business_customer, validator_lead, ds_lead.
-- Подписи UI ↔ artefact_tech_label — из src/shared/constants/InitialCollumns.ts (name).
--
-- Сводка по сценариям из обратной связи (какой bucket использует бэкенд):
-- • Модель SUM  → флаг is_editable_by_role_sum  (нужна строка model_source = sum).
-- • Модель RM   → is_editable_by_role_sum_rm    (нужна строка rm / sum_rm / sum-rm; в коде сводится к sum_rm).

-- ------------------------------------------------------------------
-- INSERT: полная ожидаемая матрица (86 строк логики; после JOIN — по одной строке на PK).
-- ------------------------------------------------------------------
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
) AS am(role_name, model_source, artefact_tech_label)
JOIN artefacts AS a ON a.artefact_tech_label = am.artefact_tech_label
JOIN roles AS r ON r.role_name = am.role_name
ON CONFLICT (artefact_id, role_id, model_source) DO NOTHING;

-- ------------------------------------------------------------------
-- business_customer: убрать RM-доступ к эпик-полям (developing_end_date / remove_date_validation не трогаем).
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
-- ds_lead: только SUM; снять любые строки на RM.
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
