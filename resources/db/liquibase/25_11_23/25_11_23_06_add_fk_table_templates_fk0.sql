--liquibase formatted sql
 
--changeset d.kravchenko:25_11_23_06_add_fk_table_templates_fk0
--comment: Добавление внешнего ключа templates_fk0 для таблицы templates

ALTER TABLE ONLY templates
    ADD CONSTRAINT templates_fk0 FOREIGN KEY (group_id) REFERENCES template_groups(group_id);

--rollback ALTER TABLE templates DROP CONSTRAINT templates_fk0;
