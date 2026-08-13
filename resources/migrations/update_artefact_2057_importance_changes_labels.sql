-- Исправление наименований артефакта 2057 (importance_changes) в СУРМ
-- Было (с опечатками): "Cущественность внесенных измененией в РС"
-- Стало: "Существенность внесенных изменений в РС"

BEGIN;

UPDATE artefacts
SET
  artefact_label = 'Существенность внесенных изменений в РС',
  artefact_desc = 'Существенность внесенных изменений в РС',
  artefact_hint = 'Существенность внесенных изменений в РС (по сравнению с предыдущей версией)'
WHERE artefact_id = 2057
  AND artefact_tech_label = 'importance_changes';

SELECT
  artefact_id,
  artefact_tech_label,
  artefact_label,
  artefact_desc,
  artefact_hint
FROM artefacts
WHERE artefact_id = 2057;

COMMIT;
