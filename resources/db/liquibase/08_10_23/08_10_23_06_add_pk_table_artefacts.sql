--liquibase formatted sql

--changeset irepin:08_10_23_06_add_pk_table_artefacts
--comment: Добавление первичного ключа для таблицы artefacts

ALTER TABLE ONLY public.artefacts
    ADD CONSTRAINT artefacts_pk PRIMARY KEY (artefact_id);

--rollback ALTER TABLE public.artefacts DROP CONSTRAINT artefacts_pk;