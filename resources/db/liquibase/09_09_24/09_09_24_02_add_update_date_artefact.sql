--liquibase formatted sql

--changeset d.kravchenko:09_09_24_02_add_update_date_artefact
--comment: Добавление артефакта update_date

INSERT INTO artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES ((SELECT MAX(artefact_id) + 1 FROM artefacts), 'update_date', 'Дата обновления', '', null, '0', '0', '1', 4, 1, '0', null,
        null, null, null, '', null);


