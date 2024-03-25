UPDATE artefact_realizations_new AS arn
SET artefact_id = a.artefact_id
FROM public.artefacts AS a
WHERE arn.artefact_custom_type = a.artefact_tech_label;