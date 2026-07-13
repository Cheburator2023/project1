-- Матрица маршрутизации истории атрибутов + cutover для partial_sync.
-- Чистое применение на dev: сначала удалить старые таблицы, затем выполнить весь файл.

-- history_source для model_source = 'sum':
--   merge        — полная история: sumd + mrms
--   partial_sync — частичная синхронизация (до 1-го edit SURM → sumd, после → mrms)
--   mrm          — только mrms
--   sum          — только sumd

CREATE TABLE IF NOT EXISTS artefact_history_source (
    artefact_id     INTEGER      NOT NULL,
    model_source    VARCHAR(16)  NOT NULL,
    history_source  VARCHAR(16)  NOT NULL,

    CONSTRAINT artefact_history_source_pkey
        PRIMARY KEY (artefact_id, model_source),

    CONSTRAINT artefact_history_source_model_source_chk
        CHECK (model_source IN ('sum', 'sum-rm')),

    CONSTRAINT artefact_history_source_history_source_chk
        CHECK (history_source IN ('sum', 'mrm', 'merge', 'partial_sync')),

    CONSTRAINT fk_artefact_history_source_artefact
        FOREIGN KEY (artefact_id)
        REFERENCES artefacts (artefact_id)
);

-- Точка разрыва partial_sync (заполняется при первом edit в SURM, шаг 2 в коде)
CREATE TABLE IF NOT EXISTS artefact_sync_cutover (
    model_id      UUID         NOT NULL,
    artefact_id   INTEGER      NOT NULL,
    cutover_at    TIMESTAMPTZ  NOT NULL,
    broken_by     VARCHAR(255) NULL,

    CONSTRAINT artefact_sync_cutover_pkey
        PRIMARY KEY (model_id, artefact_id),

    CONSTRAINT fk_artefact_sync_cutover_artefact
        FOREIGN KEY (artefact_id)
        REFERENCES artefacts (artefact_id)
);

COMMENT ON TABLE artefact_sync_cutover IS
    'Момент первого редактирования атрибута в SURM. cutover_at = effective_from первой SCD-записи в MRMS. До cutover — история из SUM, после — только SURM.';

INSERT INTO artefact_history_source (artefact_id, model_source, history_source)
SELECT
    a.artefact_id,
    'sum',
    CASE
        WHEN a.artefact_tech_label IN (
            'model_type',
            'responsible_for_significance_validity',
            'psi_protocol',
            'validation_department',
            'plan_validation_type',
            'validation_period',
            'validation_report_approve_date',
            'validation_result',
            'validation_result_approve_date',
            'auto_validation_result',
            'rfd',
            'output_table',
            'allocation_assessment_class',
            'allocation_assessment_parameters',
            'remove_decision',
            'developing_end_date'
        ) THEN 'merge'
        WHEN a.artefact_tech_label IN (
            'model_name_validation',
            'model_desc',
            'significance_validity',
            'ds_department',
            'segment_name',
            'implementation_segment',
            'data_source_description',
            'target',
            'developing_report',
            'analize_text_about_developing'
        ) THEN 'partial_sync'
        WHEN a.artefact_tech_label IN (
            'model_risk_coefficient',
            'operational_control_epic',
            'operational_control_date',
            'analytical_control_epic',
            'analytical_control_date',
            'model_values_control_epic',
            'model_values_control_date',
            'impact_assessment_epic',
            'impact_assessment_date',
            'model_data_07k_control',
            'model_data_07k_control_epic',
            'model_data_control_date',
            'check_objects_count',
            'update_date',
            'active_model',
            'classification_of_rs_by_order_of_application_within_pvr',
            'pvr',
            'degree_of_regulatory_supervision',
            'materiality_rate',
            'impact_coverage',
            'model_crs_code',
            'bank_document',
            'validity_approve_date',
            'remove_date_validation',
            'model_version_validation',
            'model_id',
            'business_model_risk_subtype',
            'business_customer',
            'model_changes_info',
            'record_id',
            'regulatory_code_rs_pvr',
            'description_rating_system',
            'identifier_model_algorithm_for_rwa',
            'regulatory_code_model_pvr',
            'internal_model_number',
            'rating_model',
            'calibration_version',
            'calibration_date',
            'regulatory_code_of_asset_class',
            'model_id_from_model_owner',
            'classification_rs_algorithm_by_asset_classes',
            'credit_risk_component',
            'method_calculation_model_parameter',
            'regulatory_class',
            'regulatory_subclass',
            'goals_using_results_of_work_rs',
            'name_and_version_rating_system',
            'version_it_implementation',
            'responsible_subdivision_and_project_lead_for_it_implementation',
            'date_of_it_introduction_into_operation',
            'date_submission_to_regulator',
            'decision_date_and_number_of_application_model_for_segment',
            'date_and_number_regulator_notification',
            'decision_date_of_application_model_for_segment',
            'decision_number_of_application_model_for_segment',
            'notification_date_and_number_of_application_model_for_segment',
            'notification_date_of_application_model_for_segment',
            'notification_number_of_application_model_for_segment',
            'decision_date_and_number_of_application_model',
            'decision_date_of_application_model',
            'decision_date_of_application_model ',
            'decision_number_of_application_model',
            'notification_date_and_number_of_application_model',
            'notification_date_of_application_model',
            'notification_number_of_application_model',
            'start_date_of_application_model_approved_regulator'
        ) THEN 'mrm'
        ELSE 'sum'
    END
FROM artefacts a
ON CONFLICT (artefact_id, model_source) DO UPDATE
SET history_source = EXCLUDED.history_source;

INSERT INTO artefact_history_source (artefact_id, model_source, history_source)
SELECT a.artefact_id, 'sum-rm', 'mrm'
FROM artefacts a
ON CONFLICT (artefact_id, model_source) DO UPDATE
SET history_source = EXCLUDED.history_source;
