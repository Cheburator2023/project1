create table artefact_realizations_new
(
    artefact_id             numeric(38),
    model_id                varchar(4000),
    artefact_value_id       numeric(38),
    artefact_string_value   varchar(4000),
    creator                 varchar(4000),
    artefact_original_value varchar(4000),
    artefact_custom_type    varchar(4000),
    effective_from          timestamp default CURRENT_TIMESTAMP(0),
    effective_to            timestamp default to_timestamp('9999-12-3123:59:59'::text, 'YYYY-MM-DDHH24:MI:SS'::text)
);

