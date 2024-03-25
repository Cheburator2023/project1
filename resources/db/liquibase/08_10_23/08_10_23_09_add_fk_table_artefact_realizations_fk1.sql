--liquibase formatted sql

--changeset irepin:08_10_23_09_add_fk_table_artefact_realizations_fk1
--comment: Добавление внешнего ключа artefact_realizations_fk1 для таблицы artefact_realizations

ALTER TABLE ONLY public.artefact_realizations
    ADD CONSTRAINT artefact_realizations_fk1 FOREIGN KEY (model_id) REFERENCES public.models(model_id);

--rollback ALTER TABLE public.artefact_realizations DROP CONSTRAINT artefact_realizations_fk1;