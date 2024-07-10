--liquibase formatted sql

--changeset d.kravchenko:15_04_24_01_create_table_templates_new
--comment: Создание таблицы templates_new

CREATE TABLE templates_new (
    template_id SERIAL NOT NULL,
    template_name CHARACTER VARYING(4000),
    user_id CHARACTER VARYING(4000) DEFAULT NULL,
    public BOOLEAN DEFAULT FALSE,
    template_value JSONB NOT NULL
);

--rollback DROP TABLE templates_new;
