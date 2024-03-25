--liquibase formatted sql

--changeset d.kravchenko:26_12_23_02_add_pumr_default_template
--comment: Добавление шаблона "Реестр действующих моделей в соответствии с ПУМР"

INSERT INTO templates (group_id, template_label, template_value)
VALUES (1, 'Реестр действующих моделей в соответствии с ПУМР', '{
  "update_date": [],
  "group_company": [],
  "model_name": [],
  "model_id": [],
  "model_version": [],
  "model_type": [],
  "model_risk_type": [],
  "model_desc": [],
  "implementation_segment": [],
  "business_customer": [],
  "business_customer_department": [],
  "significance_validity": [],
  "responsible_for_significance_validity": [],
  "implementation_validity": [],
  "validity_approve": [],
  "remove_date": [],
  "remove_decision": [],
  "model_changes_info": [],
  "ds_department": [],
  "analize_text_about_developing": [],
  "developing_end_date": [],
  "validation_report_approve_date": [],
  "validation_result": [],
  "validation_result_approve_date": [],
  "auto_validation_result": [],
  "active_model": [
    "1"
  ]
}');
