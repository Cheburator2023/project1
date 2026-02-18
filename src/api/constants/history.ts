// Временное решение: список artefact_tech_label,
// для которых история изменений хранится только в БД СУМ-РМ.
// Будет удалено после реализации задачи по переработке механизма истории изменений.

const TECH_LABELS_HISTORY_ONLY_IN_SUM_RM = [
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
]

export { TECH_LABELS_HISTORY_ONLY_IN_SUM_RM }
