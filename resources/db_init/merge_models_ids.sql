UPDATE models_new AS mn
SET model_id = ids.model_id
FROM models_ids AS ids
WHERE mn.root_model_id = ids.root_model_id
    and mn.model_version = ids.model_version;


UPDATE models_new AS mn
SET model_id = uuid_in(overlay(overlay(md5(random()::text || ':' || random()::text) placing '4' from 13) placing to_hex(floor(random()*(11-8+1) + 8)::int)::text from 17)::cstring)
WHERE model_id is null;