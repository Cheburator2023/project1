--liquibase formatted sql

--changeset d.kravchenko:15_04_24_02_add_pk_table_templates_new
--comment: Добавление первичного ключа для таблицы templates_new

ALTER TABLE ONLY templates_new
    ADD CONSTRAINT templates_new_pk PRIMARY KEY (template_id);

--rollback ALTER TABLE templates_new DROP CONSTRAINT templates_new_pk;
