--liquibase formatted sql

--changeset d.kravchenko:25_11_23_04_add_pk_table_template_groups
--comment: Добавление первичного ключа для таблицы template_groups

ALTER TABLE ONLY template_groups
    ADD CONSTRAINT template_groups_pk PRIMARY KEY (group_id);

--rollback ALTER TABLE template_groups DROP CONSTRAINT template_groups_pk;
