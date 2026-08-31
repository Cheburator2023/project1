const setValidationReportApproveDateTypeSql: string = `
UPDATE artefacts a
   SET artefact_type_id = (
       SELECT t.artefact_type_id
         FROM artefact_x_type t
        WHERE t.artefact_type_desc = 'retro-date'
   )
 WHERE a.artefact_tech_label = 'validation_report_approve_date'
   AND a.artefact_type_id IS DISTINCT FROM (
       SELECT t.artefact_type_id
         FROM artefact_x_type t
        WHERE t.artefact_type_desc = 'retro-date'
   );
`

export { setValidationReportApproveDateTypeSql }
