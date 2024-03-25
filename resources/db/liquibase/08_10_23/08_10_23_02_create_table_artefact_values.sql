--liquibase formatted sql
 
--changeset irepin:08_10_23_02_create_table_artefact_values
--comment: Создание таблицы artefact_values

CREATE TABLE public.artefact_values (
    artefact_value_id integer NOT NULL,
    artefact_id integer NOT NULL,
    artefact_value character varying(4000) NOT NULL,
    artefact_value_label character varying(4000),
    is_active_flg character varying(1) DEFAULT '1'::character varying,
    artefact_parent_value_id integer,
    CONSTRAINT is_active_flg CHECK (((is_active_flg)::text = ANY (ARRAY[('0'::character varying)::text, ('1'::character varying)::text])))
);

--rollback DROP TABLE public.artefact_values;