--liquibase formatted sql
 
--changeset irepin:04_12_23_04_create_table_typeorm_metadata
--comment: Создание таблицы typeorm_metadata

CREATE TABLE public.typeorm_metadata (
    type character varying NOT NULL,
    database character varying,
    schema character varying,
    "table" character varying,
    name character varying,
    value text
);

--rollback DROP TABLE public.typeorm_metadata;