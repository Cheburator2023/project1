--liquibase formatted sql

--changeset d.kravchenko:22_02_24_01_add_dadm_default_template
--comment: Добавление шаблона "Реестр моделей ДАДМ"

INSERT INTO templates (group_id, template_label, template_value)
VALUES (1, 'Реестр моделей ДАДМ', '{
  "model_alias": [],
  "rfd": [],
  "model_name_dadm": [],
  "ds_stream": [
    "not-null"
  ],
  "assignment_contractor": [],
  "model_epic_04": [],
  "model_epic_04_date": [],
  "model_epic_05": [],
  "developing_end_date": [],
  "model_epic_05a": [],
  "data_completion_of_stage_05a": [],
  "solution_to_implement_model": [],
  "active_model": [],
  "model_epic_07": [],
  "model_epic_07_date": [],
  "custom_model_id": [],
  "custom_model_type": [],
  "release": [],
  "model_epic_09": [],
  "date_of_it_introduction_into_operation": [],
  "model_epic_11": [],
  "model_epic_11_date": [],
  "model_epic_12": [],
  "model_epic_12_date": [],
  "remove_date": [],
  "business_customer": [],
  "business_customer_departament": [],
  "model_status": [],
  "model_status_assignee": []
}');
