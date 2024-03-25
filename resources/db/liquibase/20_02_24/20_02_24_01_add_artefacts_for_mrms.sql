--liquibase formatted sql

--changeset d.kravchenko:20_02_24_01_add_artefacts_for_mrms
--comment: Добавление артефактов

INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2104, 'developing_model_reason', 'Основание для разработки', '', null, '0', '0', '1', 5, 1, '0', null,
        null, null, null, '', null);

INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2105, 'product_name', 'Продукт и область применения модели', '', null, '0', '0', '1', 5, 1, '0', null,
        null, null, null, '', null);

INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2106, 'provides_piloting', 'Предусмотрено пилотирование', '', null, '0', '0', '1', 6, 1, '0', null,
        null, null, null, '', null);

INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2107, 'operational_monitoring', 'Оперативный мониторинг', '', null, '0', '0', '1', 6, 1, '0', null,
        null, null, null, '', null);

INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2108, 'analytical_monitoring', 'Аналитический мониторинг', '', null, '0', '0', '1', 6, 1, '0', null,
        null, null, null, '', null);
