--liquibase formatted sql

--changeset d.kravchenko:26_12_23_04_add_rwa_default_template
--comment: Добавление шаблона "Реестр моделей используемых для расчета RWA"

INSERT INTO templates (group_id, template_label, template_value)
VALUES (1, 'Реестр моделей используемых для расчета RWA', '{
  "pvr": [
    "1"
  ],
  "description_rating_system": [],
  "model_name": [],
  "model_crs_code": [],
  "credit_risk_component": [],
  "model_type": [],
  "regulatory_code_model_pvr": [],
  "method_calculation_model_parameter": [],
  "implementation_validity": [],
  "validity_approve_date": [],
  "remove_date": [],
  "validation_report_approve_date": [],
  "decision_date_of_application_model_for_segment": [],
  "decision_number_of_application_model_for_segment": [],
  "notification_date_of_application_model_for_segment": [],
  "notification_number_of_application_model_for_segment": [],
  "decision_date_of_application_model": [],
  "decision_number_of_application_model": [],
  "notification_date_of_application_model": [],
  "notification_number_of_application_model": []
}');
