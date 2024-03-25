--liquibase formatted sql
 
--changeset irepin:04_12_23_02_create_table_models_ids
--comment: Создание таблицы models_ids

CREATE TABLE public.models_ids (
    model_id character varying(4000),
    root_model_id character varying(4000),
    model_version character varying(4000)
);

--rollback DROP TABLE public.models_ids;