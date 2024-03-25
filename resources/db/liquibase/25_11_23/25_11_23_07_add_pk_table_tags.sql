--liquibase formatted sql

--changeset d.kravchenko:25_11_23_07_add_pk_table_tags
--comment: Добавление первичного ключа для таблицы tags

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pk PRIMARY KEY (tag_id);

--rollback ALTER TABLE public.tags DROP CONSTRAINT tags_pk;
