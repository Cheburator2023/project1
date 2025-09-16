const getArtefacts = `
SELECT DISTINCT t1.*,
                t2.*,
                t3.*,
                t1.artefact_id,
                t3.artefact_type_id
FROM artefacts t1
         LEFT JOIN
     artefact_values t2
     ON
                 t1.artefact_id = t2.artefact_id
             AND
                 t2.is_active_flg = '1'
         INNER JOIN
     artefact_x_type t3
     ON
         t1.artefact_type_id = t3.artefact_type_id
ORDER BY t1.artefact_id,
         t2.sort_order NULLS LAST,
         t2.artefact_value_id
`

export { getArtefacts }
