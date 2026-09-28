const resetStuckModelArchivingSql: string = `
CREATE TEMP TABLE changed_models (
    model_id varchar(4000) PRIMARY KEY
) ON COMMIT DROP;

WITH updated_stages AS (
    UPDATE model_stage_override
       SET effective_to = GREATEST(effective_from, current_timestamp::timestamp),
           updated_at = current_timestamp
     WHERE model_id IN (
               'c0df893d-680e-11ee-9d0f-0a5801010611',
               'd4ae574d-0c22-11ed-8325-0a580107050e',
               'fb1a3818-70e3-11ed-a9f8-0a5801050287'
           )
       AND effective_to = timestamp '9999-12-31 23:59:59'
    RETURNING model_id
)
INSERT INTO changed_models (model_id)
SELECT DISTINCT model_id
  FROM updated_stages
ON CONFLICT (model_id) DO NOTHING;

WITH updated_statuses AS (
    UPDATE model_status_override
       SET effective_to = GREATEST(effective_from, current_timestamp::timestamp),
           updated_at = current_timestamp
     WHERE model_id IN (
               'c0df893d-680e-11ee-9d0f-0a5801010611',
               'd4ae574d-0c22-11ed-8325-0a580107050e',
               'fb1a3818-70e3-11ed-a9f8-0a5801050287'
           )
       AND effective_to = timestamp '9999-12-31 23:59:59'
    RETURNING model_id
)
INSERT INTO changed_models (model_id)
SELECT DISTINCT model_id
  FROM updated_statuses
ON CONFLICT (model_id) DO NOTHING;

UPDATE model_recalc_queue q
   SET attempts = 0
  FROM changed_models changed
 WHERE q.model_id = changed.model_id;
`

export { resetStuckModelArchivingSql }
