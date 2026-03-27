-- Бизнес-заказчик: права на редактирование артефактов для sum_rm-моделей.
-- ds_department / developing_report — блокировались при «Действующая модель», обязательность не отображалась.
-- rating_model — авто-установка «Да» в EDIT при отсутствии роли в artefact_source_roles.

INSERT INTO artefact_source_roles (artefact_id, model_source, role_id)
SELECT
    a.artefact_id,
    'sum_rm',
    r.role_id
FROM artefacts a
CROSS JOIN roles r
WHERE a.artefact_tech_label IN ('ds_department', 'developing_report', 'rating_model')
  AND r.role_name = 'business_customer'
  AND NOT EXISTS (
      SELECT 1
      FROM artefact_source_roles asr
      WHERE asr.artefact_id  = a.artefact_id
        AND asr.model_source = 'sum_rm'
        AND asr.role_id      = r.role_id
  );
