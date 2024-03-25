--liquibase formatted sql
 
--changeset irepin:08_10_23_08_add_fk_table_artefact_realizations_fk0
--comment: Добавление внешнего ключа artefact_realizations_fk0 для таблицы artefact_realizations

ALTER TABLE ONLY public.artefact_realizations
    ADD CONSTRAINT artefact_realizations_fk0 FOREIGN KEY (artefact_id) REFERENCES public.artefacts(artefact_id);

--rollback ALTER TABLE public.artefact_realizations DROP CONSTRAINT artefact_realizations_fk0;