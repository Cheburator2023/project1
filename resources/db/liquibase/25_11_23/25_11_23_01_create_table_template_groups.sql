--liquibase formatted sql

--changeset d.kravchenko:25_11_23_01_create_table_template_groups
--comment: Создание таблицы template_groups

CREATE TABLE template_groups (
    group_id SERIAL NOT NULL,
    user_id INTEGER,
    group_label CHARACTER VARYING(4000)
);

--rollback DROP TABLE template_groups;
