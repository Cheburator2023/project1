--liquibase formatted sql

--changeset irepin:08_10_23_07_add_pk_table_models
--comment: Добавление первичного ключа для таблицы models

ALTER TABLE ONLY public.models
    ADD CONSTRAINT models_pk PRIMARY KEY (model_id);

--rollback ALTER TABLE public.models DROP CONSTRAINT models_pk;