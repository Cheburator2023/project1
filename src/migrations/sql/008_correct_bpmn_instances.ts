const correctBpmnInstancesSql: string = `
UPDATE bpmn_instances
   SET effective_to = '2025-12-25 11:44:53'
 WHERE bpmn_instance_id = '42bcf60b-e16d-11f0-a5ed-d20139007716'
   AND model_id = '05f6ea65-e0ac-11f0-a5ed-d20139007716';
UPDATE bpmn_instances
   SET effective_to = '2026-03-30 10:24:08'
 WHERE bpmn_instance_id = 'adb21b56-2c07-11f1-a2da-c20397ff4bcf'
   AND model_id = '05f6ea65-e0ac-11f0-a5ed-d20139007716';
UPDATE bpmn_instances
   SET effective_to = '2025-12-25 16:27:12'
 WHERE bpmn_instance_id = '3efb1648-e16e-11f0-a5ed-d20139007716'
   AND model_id = '05f6ea65-e0ac-11f0-a5ed-d20139007716';
INSERT INTO bpmn_instances (
    bpmn_instance_id, model_id, create_dttm, bpmn_key_id,
    bpmn_parent_id, effective_from, effective_to
)
VALUES ('70beb44d-2c09-11f1-a2da-c20397ff4bcf', '05f6ea65-e0ac-11f0-a5ed-d20139007716', '2026-03-30 10:24:08', 6, null, '2026-03-30 10:24:08', '9999-12-31 23:59:59.000');

UPDATE bpmn_instances
   SET effective_to = '2026-09-07 13:55:12'
 WHERE bpmn_instance_id = 'e8114f9d-b92d-11ef-b539-924c8a1ad774'
   AND model_id = '33cd2eb6-7438-11ef-b31b-32eed338898a';

INSERT INTO bpmn_instances (
    bpmn_instance_id, model_id, create_dttm, bpmn_key_id,
    bpmn_parent_id, effective_from, effective_to
)
VALUES ('a5b7c791-adb0-11f1-9e82-da046c0c52d0', '46ce693d-9d67-11f0-85e7-6acaf3e539fd', '2026-09-11 07:16:03', 6, null, '2026-09-11 07:16:03', '9999-12-31 23:59:59.000');

UPDATE bpmn_instances
   SET effective_to = '2026-09-01 09:43:57'
 WHERE bpmn_instance_id = '88258882-a5e9-11f1-9e82-da046c0c52d0'
   AND model_id = 'ea1a211e-8a7a-11f1-9626-a6ce09b86072';
UPDATE bpmn_instances
   SET effective_to = '2026-09-02 10:58:31'
 WHERE bpmn_instance_id = '7175cc91-a5f2-11f1-9e82-da046c0c52d0'
   AND model_id = 'ea1a211e-8a7a-11f1-9626-a6ce09b86072';
UPDATE bpmn_instances
   SET effective_to = '2026-09-02 10:58:31'
 WHERE bpmn_instance_id = '7176b71f-a5f2-11f1-9e82-da046c0c52d0'
   AND model_id = 'ea1a211e-8a7a-11f1-9626-a6ce09b86072';
UPDATE bpmn_instances
   SET effective_to = '2026-09-02 11:15:14'
 WHERE bpmn_instance_id = '3c524424-a6bd-11f1-9e82-da046c0c52d0'
   AND model_id = 'ea1a211e-8a7a-11f1-9626-a6ce09b86072';
INSERT INTO bpmn_instances (
    bpmn_instance_id, model_id, create_dttm, bpmn_key_id,
    bpmn_parent_id, effective_from, effective_to
)
VALUES ('922e2ca6-a6bf-11f1-9e82-da046c0c52d0', 'ea1a211e-8a7a-11f1-9626-a6ce09b86072', '2026-09-02 11:15:14', 6, null, '2026-09-02 11:15:14', '9999-12-31 23:59:59.000');
`

export { correctBpmnInstancesSql }
