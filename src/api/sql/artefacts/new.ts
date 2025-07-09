const sql = `
INSERT INTO artefact_realizations_new
(model_id,
 artefact_id,
 artefact_value_id,
 artefact_string_value,
 creator)
VALUES (:model_id,
        :artefact_id,
        :artefact_value_id,
        :artefact_string_value,
        :creator)
`

export { sql };
