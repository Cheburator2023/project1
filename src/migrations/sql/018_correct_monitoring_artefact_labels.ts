// Metadata only: technical labels and stored model values remain unchanged.
export const correctMonitoringArtefactLabelsSql = `
DO $$
BEGIN
    UPDATE artefacts
       SET artefact_label = 'Существенность внесенных изменений в РС',
           artefact_desc = 'Существенность внесенных изменений в РС',
           artefact_hint = 'Существенность внесенных изменений в РС (по сравнению с предыдущей версией)'
     WHERE artefact_id = 2057
       AND artefact_tech_label = 'importance_changes';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Expected artefact 2057 (importance_changes)';
    END IF;

    UPDATE artefacts
       SET artefact_label = 'Канал(ы) внедрения',
           artefact_desc = 'Канал(ы) внедрения',
           artefact_hint = 'Укажите канал(ы) внедрения'
     WHERE artefact_id = 2678
       AND artefact_tech_label = 'model_data_07k_control';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Expected artefact 2678 (model_data_07k_control)';
    END IF;
END
$$;
`
