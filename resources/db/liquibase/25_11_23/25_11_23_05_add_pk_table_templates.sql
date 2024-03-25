--liquibase formatted sql

--changeset d.kravchenko:25_11_23_05_add_pk_table_templates
--comment: Добавление первичного ключа для таблицы templates

ALTER TABLE ONLY templates
    ADD CONSTRAINT templates_pk PRIMARY KEY (template_id);

--rollback ALTER TABLE templates DROP CONSTRAINT templates_pk;
