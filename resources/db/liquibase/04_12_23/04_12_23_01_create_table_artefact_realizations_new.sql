--liquibase formatted sql
 
--changeset irepin:04_12_23_01_create_table_artefact_realizations_new
--comment: Создание таблицы artefact_realizations_new

CREATE TABLE public.artefact_realizations_new (
    artefact_id numeric(38,0),
    model_id character varying(4000),
    artefact_value_id numeric(38,0),
    artefact_string_value character varying(4000),
    creator character varying(4000),
    artefact_original_value character varying(4000),
    artefact_custom_type character varying(4000),
    effective_from timestamp without time zone DEFAULT CURRENT_TIMESTAMP(0),
    effective_to timestamp without time zone DEFAULT to_timestamp('9999-12-3123:59:59'::text, 'YYYY-MM-DDHH24:MI:SS'::text)
);

--rollback DROP TABLE public.artefact_realizations_new;