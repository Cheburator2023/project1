export const ALWAYS_ALLOWED_ARTEFACTS = [
  'significance_validity',
  'group_company',
  'validation_result_approve_date',
  'model_id',
  'data_source_description',
  'auto_validation_result',
  'significance_validity',
  'rating_system_name',
  'responsible_for_significance_validity',
  'validation_department',
  'validation_period',
  'plan_validation_type',
  'model_changes_info',
  'validation_result',
  'psi_protocol',
  'implementation_segment',
  'remove_decision',
  'validation_report_approve_date'
]

export const ALWAYS_ALLOWED_TASKS = [
  'psevdotask'
]

export const INTEGRATION_MODEL_ARTEFACTS = [
  'model_service_dev_link',
  'model_integration_dag_link',
  'source_code_link',
  'build_link',
  'docker_artifact_link',
  'data_lineage_ml_link',
  'devsecops_project_area',
  'code_repository_uri',
  'release_branch',
  'deployment_channel',
  'output_table',
  'allocation_assessment_class',
  'allocation_assessment_parameters',
  'deploy_team',
  'runtime_subsystem',
  'final_version_spec'
]

export const TEST_PREPROD_TRANSFER_PROD_ARTEFACTS = [
  'integration_decree_date',
  'release',
  'model_epic_09',
  'date_of_introduction_into_operation',
  'model_epic_11',
  'model_epic_11_date',
  'customer_model_id'
]

export const MODEL_FINAL_STATUSES = [
  'Внедрена в ПИМ',
  'Модель была внедрена в ПИМ (старая версия)',
  'Модель внедряется в ПИМ',
  'Разработана, внедрена в ПИМ'
]

// version_tag для схем, у которых отсутствуют процессы INTEGRATION_MODEL и TEST_PREPROD_TRANSFER_PROD
export const SPECIAL_SCHEMAS_VERSION_TAGS = [
  'initial',
  'initial-old',
  'None',
  'version5_2022_04',
  'version7_2022_07',
  'version8_2022_08',
  'version8_2022_08-old',
  'version9_2023_04',
  'version9_2024_08'
]

// Артефакты, tech_label которых различается в СУМ и РМ. Key - значение из СУМ, value - значение из РМ
export const MAPPED_ARTEFACTS = {
  model_epic_05_date: 'developing_end_date'
}
