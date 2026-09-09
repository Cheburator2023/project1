const enableImplementationDocSetFileEditingSql: string = `
UPDATE artefacts
   SET is_edit_flg = '1'
 WHERE artefact_tech_label = 'implementation_doc_set_file'
   AND is_edit_flg <> '1';
`

export { enableImplementationDocSetFileEditingSql }
