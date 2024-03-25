--liquibase formatted sql
 
--changeset irepin:08_10_23_04_create_table_models
--comment: Создание таблицы models

CREATE TABLE public.models (
    root_model_id integer NOT NULL,
    model_id character varying(4000) NOT NULL,
    model_name character varying(4000) NOT NULL,
    model_desc character varying(4000) NOT NULL,
    model_version integer DEFAULT 1,
    create_date timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP(0),
    update_date timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP(0),
    update_author character varying(4000),
    bpmn_instance_id character varying(4000),
    parent_model_id character varying(4000),
    mipm character varying(4000),
    models_is_active_flg character varying(1) DEFAULT '1'::character varying,
    deployment_id integer,
    model_creator character varying(4000),
    CONSTRAINT models_is_active_flg CHECK (((models_is_active_flg)::text = ANY (ARRAY[('0'::character varying)::text, ('1'::character varying)::text])))
);

--rollback DROP TABLE public.models;