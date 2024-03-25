--liquibase formatted sql

--changeset d.kravchenko:25_11_23_03_create_table_tags
--comment: Создание таблицы tags

CREATE TABLE tags (
    tag_id integer NOT NULL,
    user_id integer NOT NULL,
    model_id character varying(4000) NOT NULL,
    tag_label character varying(4000)
);

--rollback DROP TABLE tags;
