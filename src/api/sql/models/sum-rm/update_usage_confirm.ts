const sql = `
WITH updated AS (
    UPDATE model_usage_confirm
        SET confirmation_date = TO_TIMESTAMP(:confirmation_date, 'DD:MM:YYYY')::TIMESTAMPTZ
        WHERE model_id = :model_id
            AND EXTRACT(YEAR FROM confirmation_date) = EXTRACT(YEAR FROM TO_TIMESTAMP(:confirmation_date, 'DD:MM:YYYY')::TIMESTAMPTZ)
            AND EXTRACT(QUARTER FROM confirmation_date) = EXTRACT(QUARTER FROM TO_TIMESTAMP(:confirmation_date, 'DD:MM:YYYY')::TIMESTAMPTZ)
        RETURNING *
)
INSERT
INTO model_usage_confirm (model_id, confirmation_date)
SELECT :model_id, TO_TIMESTAMP(:confirmation_date, 'DD:MM:YYYY')::TIMESTAMPTZ
WHERE NOT EXISTS(
        SELECT 1
        FROM model_usage_confirm
        WHERE model_id = :model_id
          AND EXTRACT(YEAR FROM confirmation_date) = EXTRACT(YEAR FROM TO_TIMESTAMP(:confirmation_date, 'DD:MM:YYYY')::TIMESTAMPTZ)
          AND EXTRACT(QUARTER FROM confirmation_date) = EXTRACT(QUARTER FROM TO_TIMESTAMP(:confirmation_date, 'DD:MM:YYYY')::TIMESTAMPTZ)
    );
`;

export { sql };
