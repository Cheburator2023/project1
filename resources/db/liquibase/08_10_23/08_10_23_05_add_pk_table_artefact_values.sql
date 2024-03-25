--liquibase formatted sql
 
--changeset irepin:08_10_23_05_add_pk_table_artefact_values
--comment: Добавление первичного ключа для таблицы artefact_values

ALTER TABLE ONLY public.artefact_values
    ADD CONSTRAINT artefact_values_pk PRIMARY KEY (artefact_value_id);

--rollback ALTER TABLE public.artefact_values DROP CONSTRAINT artefact_values_pk;