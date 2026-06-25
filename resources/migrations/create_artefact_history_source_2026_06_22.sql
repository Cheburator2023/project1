CREATE TABLE IF NOT EXISTS artefact_history_source (
    artefact_id     INTEGER      NOT NULL,
    model_source    VARCHAR(16)  NOT NULL,
    history_source  VARCHAR(16)  NOT NULL,

    CONSTRAINT artefact_history_source_pkey
        PRIMARY KEY (artefact_id, model_source),

    CONSTRAINT artefact_history_source_model_source_chk
        CHECK (model_source IN ('sum', 'sum-rm')),

    CONSTRAINT artefact_history_source_history_source_chk
        CHECK (history_source IN ('sum', 'mrm')),

    CONSTRAINT fk_artefact_history_source_artefact
        FOREIGN KEY (artefact_id)
        REFERENCES artefacts (artefact_id)
);

INSERT INTO artefact_history_source (artefact_id, model_source, history_source)
SELECT
    a.artefact_id,
    'sum',
    CASE
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
            'degree_of_regulatory_supervision',
            'materiality_rate',
            'impact_coverage',
            'model_type',
            'significance_validity',
            'responsible_for_significance_validity',
            'segment_name',
            'implementation_segment',
            'developing_report',
            'data_source_description',
            'target',
            'psi_protocol',
            'validation_department',
            'plan_validation_type',
            'validation_period',
            'validation_report_approve_date',
            'validation_result',
            'validation_result_approve_date',
            'auto_validation_result',
            'model_changes_info',
            'model_desc',
            'model_name_validation',
            'rfd',
            'output_table',
            'allocation_assessment_class',
            'allocation_assessment_parameters',
            'remove_decision'
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
