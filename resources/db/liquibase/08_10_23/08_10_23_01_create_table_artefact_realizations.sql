--liquibase formatted sql
 
--changeset irepin:08_10_23_01_create_table_artefact_realizations
--comment: Создание таблицы artefact_realizations

CREATE TABLE public.artefact_realizations (
    artefact_id integer NOT NULL,
    model_id character varying(4000) NOT NULL,
    artefact_value_id integer,
    artefact_string_value character varying(4000),
    creator character varying(4000),
    artefact_original_value character varying(4000),
    artefact_custom_type character varying(4000),
    effective_from timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP(0),
    effective_to timestamp(6) without time zone DEFAULT to_timestamp('9999-12-3123:59:59'::text, 'YYYY-MM-DDHH24:MI:SS'::text)
);

--rollback DROP TABLE public.artefact_realizations;