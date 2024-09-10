--liquibase formatted sql

--changeset d.kravchenko:09_09_24_03_add_artefact_values
--comment: Добавление словарей для артефактов

INSERT INTO artefact_values (artefact_value_id, artefact_id, artefact_value, artefact_value_label, is_active_flg, artefact_parent_value_id)
VALUES ((SELECT MAX(artefact_value_id) + 1 FROM artefact_values), (SELECT artefact_id FROM artefacts WHERE artefact_tech_label = 'rating_model'), 'Да', 'Да', '1',
        NULL);

INSERT INTO artefact_values (artefact_value_id, artefact_id, artefact_value, artefact_value_label, is_active_flg, artefact_parent_value_id)
VALUES ((SELECT MAX(artefact_value_id) + 1 FROM artefact_values), (SELECT artefact_id FROM artefacts WHERE artefact_tech_label = 'rating_model'), 'Нет', 'Нет', '1',
        NULL);


