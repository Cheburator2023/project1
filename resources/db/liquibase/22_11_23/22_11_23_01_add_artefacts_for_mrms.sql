--liquibase formatted sql

--changeset d.kravchenko:22_11_23_01_add_artefacts_for_mrms
--comment: Добавление артефактов


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2000, 'record_id', 'ID записи', '', null, '0', '0', '0', 1, 1, '0', null,
        null, null, null, '', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2001, 'model_id', 'Идентификатор Модели / ID', '', null, '0', '0', '0', 1, 1, '0', null,
        null, null, null, '', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2002, 'group_company', 'Укажите компанию группы', 'Выберите компанию группы', null, '0', '0', '1', 5, 1, '0',
        null,
        null, null, null, 'Выбирается значения ЮЛ группы ВТБ.', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2003, 'rating_system_name', 'Название Рейтинговой системы', 'Укажите название Рейтинговой системы', null, '0',
        '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите название Рейтинговой системы', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2004, 'regulatory_code_rs_pvr', 'Регуляторный код РС (ПВР)', 'Укажите регуляторный код РС (ПВР)', null, '0',
        '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите регуляторный код РС (ПВР)', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2005, 'description_rating_system', 'Описание Рейтинговой системы', 'Укажите описание Рейтинговой системы', null,
        '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите описание Рейтинговой системы', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2006, 'model_crs_code', 'Код модели ЦРС', 'Укажите код модели ЦРС', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите код модели ЦРС ', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2007, 'model_type', 'Тип / классификация Модели', 'Выберите тип / классификацию модели', null, '0', '0', '1', 5,
        1, '0', null,
        null, null, null, 'Выберите тип / классификацию модели', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2008, 'identifier_model_algorithm_for_rwa', 'Идентификатор Модели / Алгоритма для целей RWA',
        'Укажите идентификатор Модели / Алгоритма для целей RWA', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите идентификатор Модели / Алгоритма для целей RWA', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2009, 'regulatory_code_model_pvr', 'Регуляторный код Модели (ПВР)', 'Укажите регуляторный код Модели (ПВР)',
        null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите регуляторный код Модели (ПВР)', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2010, 'internal_model_number', 'Внутренний номер модели', 'Укажите внутренний номер модели', null, '0', '0',
        '1', 1, 1, '0', null,
        null, null, null, 'Укажите внутренний номер модели', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2011, 'active_model', 'Действующая модель / модуль', 'Действующая модель / модуль', null, '0', '0', '1', 6, 1,
        '0', null,
        null, null, null, 'Действующая модель / модуль', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2012, 'model_indicator', 'Индикатор модели', 'Укажите индикатор модели', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите индикатор модели', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2013, 'calibration_version', 'Версия калибровки', 'Укажите версию калибровки', null, '0', '0', '1', 1, 1, '0',
        null,
        null, null, null, 'Укажите версию калибровки', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2014, 'calibration_version', 'Версия калибровки', 'Укажите версию калибровки', null, '0', '0', '1', 1, 1, '0',
        null,
        null, null, null, 'Укажите версию калибровки', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2015, 'calibration_date', 'Дата калибровки', 'Укажите дату калибровки', null, '0', '0', '1', 4, 1, '0', null,
        null, null, null, 'Укажите дату калибровки', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2016, 'regulatory_code_of_asset_class', 'Регуляторный код класса/подкласса активов',
        'Укажите регуляторный код класса/подкласса активов', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите регуляторный код класса/подкласса активов', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2017, 'model_id_from_model_owner', 'Идентификатор Модели / Алгоритма от Владельца модели',
        'Укажите идентификатор Модели / Алгоритма', null, '0', '1', '1', 1, 1, '0', null,
        null, null, null, 'Укажите идентификатор Модели / Алгоритма', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2018, 'classification_rs_algorithm_by_asset_classes', 'Классификация РС / Алгоритма по классам активов',
        'Классификация РС / Алгоритма по классам активов', null, '0', '0', '1', 3, 1, '0', null,
        null, null, null, 'Классификация РС / Алгоритма по классам активов', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2019, 'significance_validity', 'Уровень значимости Модели / РС', 'Укажитве уровень значимости Модели / РС',
        null, '0', '0', '1', 3, 1, '0', null,
        null, null, null, 'Укажите уровень значимости Модели / РС', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2020, 'degree_of_regulatory_supervision', 'Степень регуляторного надзора',
        'Укажите степень регуляторного надзора', null, '0', '0', '1', 3, 1, '0', null,
        null, null, null, 'Укажите степень регуляторного надзора', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2021, 'materiality_rate', 'Уровень материальности', 'Укажите уровень материальности', null, '0', '0', '1', 3, 1,
        '0', null,
        null, null, null, 'Укажите уровень материальности', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2022, 'impact_coverage', 'Охват последствий', 'Укажите охват последствий', null, '0', '0', '1', 3, 1, '0', null,
        null, null, null, 'Укажите охват последствий', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2023, 'responsible_for_significance_validity', 'Кем определен уровень значимости Модели / РС',
        'Укажите Кем определен уровень значимости Модели / РС', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите Кем определен уровень значимости Модели / РС', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2024, 'classification_of_rs_by_order_of_application_within_pvr',
        'Классификация РС по порядку применения в рамках ПВР',
        'Укажите классификацияю РС по порядку применения в рамках ПВР', null, '0', '0', '1', 3, 1, '0', null,
        null, null, null, 'Укажите Классификацию РС по порядку применения в рамках ПВР', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2025, 'credit_risk_component', 'Компонент кредитного риска', 'Укажите компонент кредитного риска', null, '0',
        '0', '1', 3, 1, '0', null,
        null, null, null, 'Укажите компонент кредитного риска', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2026, 'method_calculation_model_parameter', 'Метод расчета параметра Модели',
        'Укажите метод расчета параметра Модели', null, '0', '0', '1', 3, 1, '0', null,
        null, null, null, 'Укажите метод расчета параметра Модели', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2027, 'segment_name', 'Целевой сегмент Модели / Алгоритма', 'Укажите целевой сегмент Модели / Алгоритма', null,
        '0', '0', '1', 5, 1, '0', null,
        null, null, null, 'Укажите целевой сегмент Модели / Алгоритма', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2028, 'implementation_segment', 'Сегмент применения Модели / Рейтинговой системы / Алгоритма',
        'Укажите сегмент применения Модели / Рейтинговой системы / Алгоритма', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите сегмент применения Модели / Рейтинговой системы / Алгоритма', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2029, 'regulatory_class', 'Регуляторный класс', 'Укажите регуляторный класс', null, '0', '0', '1', 1, 1, '0',
        null,
        null, null, null, 'Укажите регуляторный класс', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2030, 'regulatory_subclass', 'Регуляторный подкласс кредитных требований',
        'Укажите регуляторный подкласс кредитных требований', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите регуляторный подкласс кредитных требований', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2031, 'business_customer', 'Владелец Модели / Алгоритма', 'Укажите владельца Модели/ Алгоритма', null, '0', '0',
        '1', 1, 1, '0', null,
        null, null, null, 'Укажите владельца Модели/ Алгоритма', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2032, 'business_customer_departament', 'Подразделение Владельца Модели / Алгоритма',
        'Укажите подразделение Владельца Модели / Алгоритма', null, '0', '0', '1', 5, 1, '0', null,
        null, null, null, 'Укажите подразделение Владельца Модели / Алгоритма', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2033, 'goals_using_results_of_work_rs', 'Для каких целей происходит использование результатов работы РС',
        'Укажите для каких целей происходит использование результатов работы РС', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите для каких целей происходит использование результатов работы РС', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2034, 'implementation_validity', 'Утверждение РС / Модели / Алгоритма в эксплуатацию',
        'Утверждение РС / Модели / Алгоритма в эксплуатацию', null, '0', '0', '1', 4, 1, '0', null,
        null, null, null, 'Утверждение РС / Модели / Алгоритма в эксплуатацию', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2035, 'validity_approve', 'Решение об утверждении РС / Модели', 'Решение об утверждении РС / Модели', null, '0',
        '0', '1', 1, 1, '0', null,
        null, null, null, 'Решение об утверждении РС / Модели', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2036, 'bank_document', 'Банковский документ', 'Укажите банковский документ', null, '0', '0', '1', 1, 1, '0',
        null,
        null, null, null, 'Укажите банковский документ', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2037, 'remove_date', 'Дата выведения РС / Модели из эксплуатации',
        'Укажите дату выведения РС / Модели из эксплуатации', null, '0', '0', '1', 4, 1, '0', null,
        null, null, null, 'Укажите дату выведения РС / Модели из эксплуатации', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2038, 'remove_decision', 'Реквизиты решения о выведении из эксплуатации',
        'Укажите реквизиты решения о выведении из эксплуатации', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите реквизиты решения о выведении из эксплуатации', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2039, 'ds_department', 'Подразделение разработки и вендор', 'Подразделение разработки и вендор', null, '0', '0',
        '1', 1, 1, '0', null,
        null, null, null, 'Подразделение разработки и вендор', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2040, 'developing_start_date', 'Дата начала разработки Модели', 'Укажите дату начала разработки Модели', null,
        '0', '0', '1', 4, 1, '0', null,
        null, null, null, 'Укажите дату начала разработки Модели', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2041, 'developing_end_date', 'Дата окончания разработки Модели', 'Укажите дату окончания разработки Модели',
        null, '0', '0', '1', 4, 1, '0', null,
        null, null, null, 'Укажите дату окончания разработки Модели', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2042, 'data_source_description', 'Основные источники данных', null, null, '0', '0', '0', 1, 1, '0', null,
        null, null, null, null, null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2043, 'target', 'Целевая переменная', 'Укажите целевую переменную', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите целевую переменную', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2044, 'calibration_method', 'Метод Калибровки', 'Укажите метод Калибровки', null, '0', '0', '1', 1, 1, '0',
        null,
        null, null, null, 'Укажите метод Калибровки', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2045, 'analize_text_about_developing', 'Отчет по разработке',
        'Шаблоны <a href=""/template/Шаблон_Отчет_о_разработке_модели.docx"" target=""_blank"">Шаблон_Отчет о разработке модели.docx</a> <a href=""/template/Шаблон_Аналитическая_записка_о_разработке_модели.docx"" target=""_blank"">Шаблон_Аналитическая записка о разработке модели.docx</a>',
        null, '0', '0', '1', 1, 1, '0', null,
        null, null, null,
        'Прикладывается «Отчет о разработке» или «Аналитическая записка», предполагающая более полное описание.', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2046, 'name_and_version_rating_system', 'Название и версия ИТ системы рейтингования',
        'Укажите название и версию ИТ системы рейтингования', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите название и версию ИТ системы рейтингования', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2047, 'version_it_implementation', 'Версия ИТ реализации', 'Укажите версию ИТ реализации', null, '0', '0', '1',
        1, 1, '0', null,
        null, null, null, 'Укажите версию ИТ реализации', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2048, 'responsible_subdivision_and_project_lead_for_it_implementation',
        'Ответственное подразделение и руководитель проекта внедрения ИТ реализации',
        'Укажите ответственное подразделение и руководителя проекта внедрения ИТ реализации', null, '0', '0', '1', 1, 1,
        '0', null,
        null, null, null, 'Укажите ответственное подразделение и руководителя проекта внедрения ИТ реализации', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2049, 'date_of_it_introduction_into_operation', 'Дата внедрения в промышленную эксплуатацию ИТ реализации',
        'Укажите дату внедрения в промышленную эксплуатацию ИТ реализации', null, '0', '0', '1', 4, 1, '0', null,
        null, null, null, 'Укажите дату внедрения в промышленную эксплуатацию ИТ реализации', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2050, 'psi_protocol', 'Протокол ПСИ', 'Прикрепите файл', null, '0', '0', '1', 2, 1, '0', null,
        null, null, null, 'Прикрепите файл', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2051, 'validation_department', 'Подразделение, проводившее валидацию',
        'Укажите подразделение, проводившее валидацию', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите подразделение, проводившее валидацию', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2052, 'plan_validation_type', 'Вид валидации', 'Выберите вид валидации', null, '0', '0', '1', 3, 1, '0', null,
        null, null, null, 'Выберите вид валидации', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2053, 'validation_period', 'Период проведения валидации', 'Укажите период проведения валидации', null, '0', '0',
        '1', 1, 1, '0', null,
        null, null, null, 'Укажите период проведения валидации', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2054, 'validation_report_approve_date', 'Дата утверждения отчета валидации',
        'Укажите дату утверждения отчета валидации', null, '0', '0', '1', 4, 1, '0', null,
        null, null, null, 'Укажите дату утверждения отчета валидации', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2055, 'validation_result_approve_date',
        'Информация о дате утверждения на УО МР текущих (действующих) агрегированных результатов валидации',
        'Укажите информацию о дате утверждения на УО МР текущих (действующих) агрегированных результатов валидации',
        null, '0', '0', '1', 4, 1, '0', null,
        null, null, null,
        'Укажите информацию о дате утверждения на УО МР текущих (действующих) агрегированных результатов валидации',
        null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2056, 'auto_validation_result', 'Отчет по валидации',
        'Шаблон документа <a href=""/template/Шаблон_Результаты_проведения_тестов_валидации.xlsx"" target=""_blank"">Шаблон_Результаты проведения тестов валидации.xlsx</a>',
        null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, null, null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2057, 'importance_changes', 'Cущественность внесенных измененией в РС',
        'Cущественность внесенных измененией в РС', null, '0', '0', '1', 1, 1, '0', null, null, null, null,
        'Cущественность внесенных измененией в РС (по сравнению с предыдущей версией)', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2058, 'approve_importance', 'Утверждение уровня существенности', 'Утверждение уровня существенности', null, '0',
        '0', '1', 1, 1, '0', null, null, null, null, 'Утверждение уровня существенности', null);;


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2059, 'approve_importance_changes', 'Решение об утверждении уровня существенности',
        'Решение об утверждении уровня существенности', null, '0', '0', '1', 1, 1, '0', null, null, null, null,
        'Решение об утверждении уровня существенности', null);;


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2060, 'date_and_number_regulator_notification', 'Дата и номер уведомления Регулятора',
        'Укажите дату и номер уведомления Регулятора', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите дату и номер уведомления Регулятора', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2061, 'date_submission_to_regulator', 'Дата подачи заявки Регулятору',
        'Укажите дату подачи заявки Регулятору', null, '0', '0', '1', 4, 1, '0', null,
        null, null, null, 'Укажите дату подачи заявки Регулятору', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2062, 'start_date_of_application_model_approved_regulator',
        'Дата начала применения РС / Модели, утвержденная Регулятором',
        'Укажите дату начала применения РС / Модели, утвержденная Регулятором', null, '0', '0', '1', 4, 1, '0', null,
        null, null, null, 'Укажите дату начала применения РС / Модели, утвержденная Регулятором', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2063, 'decision_date_of_application_model_for_segment',
        'Дата решения БР о выдаче разрешения на применение РС / Модели для сегмента',
        'Укажите дату решения БР о выдаче разрешения на применение РС / Модели для сегмента', null, '0', '0', '1', 4, 1,
        '0', null,
        null, null, null, 'Укажите дату решения БР о выдаче разрешения на применение РС / Модели для сегмента', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2064, 'decision_number_of_application_model_for_segment',
        'Номер решения БР о выдаче разрешения на применение РС / Модели для сегмента',
        'Укажите номер решения БР о выдаче разрешения на применение РС / Модели для сегмента', null, '0', '0', '1', 1,
        1, '0', null,
        null, null, null, 'Укажите номер решения БР о выдаче разрешения на применение РС / Модели для сегмента', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2065, 'notification_date_of_application_model_for_segment',
        'Дата уведомления БР о применении РС / Модели для сегмента',
        'Укажите дату уведомления БР о применении РС / Модели для сегмента', null, '0', '0', '1', 4, 1, '0', null,
        null, null, null, 'Укажите дату уведомления БР о применении РС / Модели для сегмента', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2066, 'notification_number_of_application_model_for_segment',
        'Номер уведомления БР о применении РС / Модели для сегмента',
        'Укажите номер уведомления БР о применении РС / Модели для сегмента', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите номер уведомления БР о применении РС / Модели для сегмента', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2067, 'decision_date_of_application_model ', 'Дата решения БР о выдаче разрешения на применение РС / Модели',
        'Укажите дату решения БР о выдаче разрешения на применение РС / Модели', null, '0', '0', '1', 4, 1, '0', null,
        null, null, null, 'Укажите дату решения БР о выдаче разрешения на применение РС / Модели', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2068, 'decision_number_of_application_model', 'Номер решения БР о выдаче разрешения на применение РС / Модели',
        'Укажите номер решения БР о выдаче разрешения на применение РС / Модели ', null, '0', '0',
        '1', 1, 1, '0', null,
        null, null, null, 'Укажите номер решения БР о выдаче разрешения на применение РС / Модели ', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2069, 'notification_date_of_application_model', 'Дата уведомления БР о применении РС / Модели',
        'Укажите дату уведомления БР о применении РС / Модели ', null, '0', '0', '1', 4, 1, '0', null,
        null, null, null, 'Укажите дату уведомления БР о применении РС / Модели ', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2070, 'notification_number_of_application_model', 'Номер уведомления БР о применении РС / Модели',
        'Укажите номер уведомления БР о применении РС / Модели ', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите номер уведомления БР о применении РС / Модели', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2071, 'model_risk_type', 'Вид / подвид риска', 'Вид / подвид риска', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Вид / подвид риска, для оценки которого применяется модель', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2072, 'model_changes_info', 'Краткая информация о решениях по изменению Модели',
        'Краткая информация о решениях по изменению Модели', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Краткая информация о решениях по изменению Модели', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2073, 'rfd', 'RFD', 'Укажите RFD', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите RFD', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2074, 'ds_stream', 'Стрим-исполнитель', 'Выберите стрим-исполнитель', null, '0', '0', '1', 5, 1, '0', null,
        null, null, null, 'Выберите стрим-исполнитель', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2075, 'assignment_contractor', 'Исполнитель', 'Укажите исполнителя', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите исполнителя', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2076, 'model_epic_04', 'Этап 04', 'Укажите Этап 04', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите Этап 04', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2077, 'model_epic_04_date', 'Дата решения 04', 'Укажите дату решения 04', null, '0', '0', '1', 4, 1, '0', null,
        null, null, null, 'Укажите дату решения 04', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2078, 'model_epic_05', 'Модельный эпик 05', 'Укажите модельный эпик 05', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите модельный эпик 05', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2079, 'model_epic_05a', 'Этап 05А', 'Укажите этап 05А', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите этап 05А', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2080, 'data_completion_of_stage_05a', 'Дата завершения разработки пилота',
        'Укажите дату завершения разработки пилота', null, '0', '0', '1', 4, 1, '0', null,
        null, null, null, 'Укажите дату завершения разработки пилота (дата 05А)', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2081, 'solution_to_implement_model', 'Решение о внедрении модели', 'Укажите решение о внедрении модели', null,
        '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите решение о внедрении модели', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2082, 'model_epic_07', 'Этап 07', 'Укажите Этап 07', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите Этап 07', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2083, 'model_epic_07_date', 'Дата решения для 07 этапа', 'Укажите дату решения для 07 этапа', null, '0', '0',
        '1', 4, 1, '0', null,
        null, null, null, 'Укажите дата решения для 07 этапа', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2084, 'custom_model_id', 'CustomModelId', 'Укажите CustomModelId', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите CustomModelId', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2085, 'custom_model_type', 'ModelType', 'Укажите ModelType', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите ModelType', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2086, 'release', 'Релиз', 'Релиз', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Релиз', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2087, 'model_epic_09', 'Модельный эпик 09', 'Укажите модельный эпик 09', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите модельный эпик 09', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2088, 'model_epic_11', 'Модельный эпик 11', 'Укажите модельный эпик 11', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите модельный эпик 11', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2089, 'model_epic_11_date', 'Дата решения для эпика 11', 'Укажите дату решения для эпика 11', null, '0', '0',
        '1', 4, 1, '0', null,
        null, null, null, 'Укажите дату решения для эпика 11', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2090, 'model_epic_12', 'Этап 12', 'Укажите Этап 12', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Укажите Этап 12', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2091, 'model_epic_12_date', 'Дата решения для эпика 12', 'Укажите дату решения для эпика 12', null, '0', '0',
        '1', 4, 1, '0', null,
        null, null, null, 'Укажите дату решения для эпика 12', null);


INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2092, 'pvr', 'ПВР', null, null, '0', '0', '0', 6, 1, '0', null,
        null, null, null, null, null);

INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2093, 'model_version', 'Версия модели / алгоритма', '', null, '0', '0', '0', 1, 1, '0', null,
        null, null, null, '', null);

INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2094, 'validity_approve_date', 'Дата утверждения РС / Модели / Алгоритма', 'Дата утверждения РС / Модели / Алгоритма', null, '0',
        '0', '1', 4, 1, '0', null,
        null, null, null, 'Дата утверждения РС / Модели / Алгоритма', null);

INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2095, 'validation_result', 'Результат валидации РС / Модели',
        'Результат валидации РС / Модели', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Результат валидации РС / Модели', null);

INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2096, 'model_name_dadm', 'Название модели в реестре ДАДМ',
        'Название модели в реестре ДАДМ', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Название модели в реестре ДАДМ', null);

INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2097, 'decision_date_and_number_of_application_model_for_segment', 'Дата и номер решения БР о выдаче разрешения на применение РС / Модели для сегмента',
        'Дата и номер решения БР о выдаче разрешения на применение РС / Модели для сегмента', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Дата и номер решения БР о выдаче разрешения на применение РС / Модели для сегмента', null);

INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2098, 'notification_date_and_number_of_application_model_for_segment', 'Дата и номер уведомления БР о применении РС / Модели для сегмента',
        'Дата и номер уведомления БР о применении РС / Модели для сегмента', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Дата и номер уведомления БР о применении РС / Модели для сегмента', null);

INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2099, 'decision_date_and_number_of_application_model_for_segment', 'Дата и номер решения БР о выдаче разрешения на применение РС / Модели для сегмента',
        'Дата и номер решения БР о выдаче разрешения на применение РС / Модели для сегмента', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Дата и номер решения БР о выдаче разрешения на применение РС / Модели для сегмента', null);

INSERT INTO public.artefacts (artefact_id, artefact_tech_label, artefact_label, artefact_desc, artefact_context,
                              is_main_info_flg, is_class_flg, is_edit_flg, artefact_type_id, artefact_business_group_id,
                              is_multi_fill_flg, artefact_parent_id, artefact_parent_value, artefact_default_value,
                              is_default_value_flg, artefact_hint, artefact_regular_expression)
VALUES (2100, 'notification_date_and_number_of_application_model', 'Дата и номер уведомления БР о применении РС / Модели',
        'Дата и номер уведомления БР о применении РС / Модели', null, '0', '0', '1', 1, 1, '0', null,
        null, null, null, 'Дата и номер уведомления БР о применении РС / Модели', null);

--rollback TRUNCATE public.artefacts;
