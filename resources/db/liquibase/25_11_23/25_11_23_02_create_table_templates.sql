--liquibase formatted sql

--changeset d.kravchenko:25_11_23_01_create_table_templates
--comment: Создание таблицы templates

CREATE TABLE templates (
    template_id SERIAL NOT NULL,
    user_id INTEGER,
    group_id INTEGER NOT NULL,
    template_label CHARACTER VARYING(4000),
    template_value JSONB NOT NULL
);

--rollback DROP TABLE templates;
