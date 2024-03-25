--liquibase formatted sql
 
--changeset irepin:04_12_23_03_create_table_models_new
--comment: Создание таблицы models_new

CREATE TABLE public.models_new (
    pp_number integer,
    root_model_id character varying(4000),
    model_id character varying(4000),
    model_name character varying(4000),
    model_desc character varying(4000),
    model_version character varying(4000),
    create_date timestamp(6) without time zone,
    update_date timestamp(6) without time zone,
    update_author character varying(4000),
    parent_model_id character varying(4000),
    models_is_active_flg character varying(1),
    model_creator character varying(4000)
);


--rollback DROP TABLE public.models_new;