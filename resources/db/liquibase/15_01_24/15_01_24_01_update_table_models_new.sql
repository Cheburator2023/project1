--liquibase formatted sql
 
--changeset irepin:15_01_24_01_update_table_models_new
--comment: Добавление колонок в таблицу models_new

ALTER TABLE models_new
ADD COLUMN first_wave integer;

ALTER TABLE models_new
ADD COLUMN second_wave integer;

--rollback ALTER TABLE models_new DROP COLUMN first_wave;
--rollback ALTER TABLE models_new DROP COLUMN second_wave;