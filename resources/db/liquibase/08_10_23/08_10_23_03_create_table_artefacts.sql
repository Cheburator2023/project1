--liquibase formatted sql
 
--changeset irepin:08_10_23_03_create_table_artefacts
--comment: Создание таблицы artefacts

CREATE TABLE public.artefacts (
    artefact_id integer NOT NULL,
    artefact_tech_label character varying(4000) NOT NULL,
    artefact_label character varying(4000) NOT NULL,
    artefact_desc character varying(4000),
    artefact_context character varying(4000),
    is_main_info_flg character varying(1) DEFAULT '0'::character varying,
    is_class_flg character varying(1) DEFAULT '0'::character varying,
    is_edit_flg character varying(1) DEFAULT '0'::character varying,
    artefact_type_id integer NOT NULL,
    artefact_business_group_id integer,
    is_multi_fill_flg character varying(1) DEFAULT '0'::character varying,
    artefact_parent_id integer,
    artefact_parent_value character varying(4000),
    artefact_default_value character varying(4000),
    is_default_value_flg character varying(1) DEFAULT '0'::character varying,
    artefact_hint character varying(4000),
    artefact_regular_expression character varying(4000),
    CONSTRAINT is_class_flg CHECK (((is_class_flg)::text = ANY (ARRAY[('0'::character varying)::text, ('1'::character varying)::text]))),
    CONSTRAINT is_edit_flg CHECK (((is_edit_flg)::text = ANY (ARRAY[('0'::character varying)::text, ('1'::character varying)::text]))),
    CONSTRAINT is_main_info_flg CHECK (((is_main_info_flg)::text = ANY (ARRAY[('0'::character varying)::text, ('1'::character varying)::text])))
);

--rollback DROP TABLE public.artefacts;