// Транзакцией и журналом выполнения управляет StartupSqlMigrationService.
export const applyModelStateCorrections21092026Sql = `
-- Источник: Таблица корректировок 21092026.xlsx, листы Этап и Статус.
-- Выполняется StartupSqlMigrationService в транзакции СУМ. Source/final не изменяются.
-- Для закрытия начало читается из БД, окончание — из плана ниже.
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
LOCK TABLE model_recalc_queue IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE model_stage_source, model_status_source IN SHARE MODE;
LOCK TABLE model_stage_override, model_status_override IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE sum21092026_plan (
 entity text, model_id text, excel_row integer, source_id integer,
 value text, excel_from timestamp, target_to timestamp
) ON COMMIT DROP;
INSERT INTO sum21092026_plan VALUES
('stage', '091d6c66-7093-11ed-a9f8-0a5801050287', 2, 5819, 'Отмена разработки', TIMESTAMP '2024-12-28 10:04:04.317000', TIMESTAMP '2025-05-16 01:48:00'),
('stage', '9eaa2ac9-0e87-11ee-8670-0a5801010376', 3, 5456, 'Отмена разработки', TIMESTAMP '2025-03-06 10:47:23.391000', TIMESTAMP '2025-05-16 00:44:10'),
('stage', 'a60d849f-cc14-11ee-a34a-0a580107025e', 4, 6196, 'Отмена разработки', TIMESTAMP '2024-12-28 09:59:34.533000', TIMESTAMP '2025-05-16 00:03:00'),
('stage', 'a8bfbb2b-cc0e-11ee-a34a-0a580107025e', 5, 6155, 'Отмена разработки', TIMESTAMP '2024-12-25 10:35:41.960000', TIMESTAMP '2025-05-16 00:12:00'),
('stage', 'b5c8fa16-ce31-11ed-a97c-0a5801020269', 6, 5397, 'Отмена разработки', TIMESTAMP '2024-12-25 11:59:10.750000', TIMESTAMP '2025-05-16 00:44:00'),
('status', '091d6c66-7093-11ed-a9f8-0a5801050287', 2, 5597, 'Разработана, не внедрена', TIMESTAMP '2022-12-21 13:54:08.661000', TIMESTAMP '2025-05-16 01:48:00'),
('status', '091d6c66-7093-11ed-a9f8-0a5801050287', 3, NULL, 'Архив', TIMESTAMP '2025-05-16 01:48:00', TIMESTAMP '9999-12-31 23:59:59'),
('status', '9eaa2ac9-0e87-11ee-8670-0a5801010376', 4, 4992, 'Разработана, не внедрена', TIMESTAMP '2023-08-10 14:44:50.913000', TIMESTAMP '2025-05-16 00:44:10'),
('status', '9eaa2ac9-0e87-11ee-8670-0a5801010376', 5, NULL, 'Архив', TIMESTAMP '2025-05-16 00:44:10', TIMESTAMP '9999-12-31 23:59:59'),
('status', 'a60d849f-cc14-11ee-a34a-0a580107025e', 6, 5634, 'Разработана, не внедрена', TIMESTAMP '2024-05-27 09:51:11.797000', TIMESTAMP '2025-05-16 00:03:00'),
('status', 'a60d849f-cc14-11ee-a34a-0a580107025e', 7, NULL, 'Архив', TIMESTAMP '2025-05-16 00:03:00', TIMESTAMP '9999-12-31 23:59:59'),
('status', 'a8bfbb2b-cc0e-11ee-a34a-0a580107025e', 8, 5248, 'Разработана, не внедрена', TIMESTAMP '2024-10-29 16:52:00.303000', TIMESTAMP '2025-05-16 00:12:00'),
('status', 'a8bfbb2b-cc0e-11ee-a34a-0a580107025e', 9, NULL, 'Архив', TIMESTAMP '2025-05-16 00:12:00', TIMESTAMP '9999-12-31 23:59:59'),
('status', 'b5c8fa16-ce31-11ed-a97c-0a5801020269', 10, 5058, 'Разработана, не внедрена', TIMESTAMP '2023-05-05 11:02:44.537000', TIMESTAMP '2025-05-16 00:44:00'),
('status', 'b5c8fa16-ce31-11ed-a97c-0a5801020269', 11, NULL, 'Архив', TIMESTAMP '2025-05-16 00:44:00', TIMESTAMP '9999-12-31 23:59:59');

CREATE TEMP TABLE sum21092026_report (
 entity text, model_id text, result text, inserted_count integer, detail text
) ON COMMIT DROP;
DO $migration$
DECLARE
 g record; p record; src record; ov record;
 v_from timestamp; v_reason text; v_count integer; v_inserted integer;
 v_projection text; v_bad boolean;
BEGIN
 FOR g IN SELECT DISTINCT entity, model_id FROM sum21092026_plan ORDER BY entity, model_id LOOP
  v_inserted := 0;
  -- Подтранзакция: закрытие и новый статус откатываются вместе при несовпадении данных.
  BEGIN
   IF NOT EXISTS (SELECT 1 FROM models m WHERE m.model_id=g.model_id) THEN
    RAISE EXCEPTION USING ERRCODE='P2109', MESSAGE='Модель отсутствует в models';
   END IF;
   FOR p IN SELECT * FROM sum21092026_plan x WHERE x.entity=g.entity AND x.model_id=g.model_id ORDER BY excel_row LOOP
    v_reason := 'SUM-21092026 / ' || p.entity || ' / row ' || p.excel_row;
    v_from := p.excel_from;
    IF p.source_id IS NOT NULL THEN
     EXECUTE format('SELECT model_id, %I AS value, effective_from, effective_to FROM %I WHERE id=$1',p.entity,'model_'||p.entity||'_source') INTO src USING p.source_id;
     IF src.model_id IS DISTINCT FROM p.model_id OR src.value IS DISTINCT FROM p.value THEN
      RAISE EXCEPTION USING ERRCODE='P2109', MESSAGE=format('Source %s отсутствует или принадлежит другой модели/значению',p.source_id);
     END IF;
     v_from := src.effective_from;
    END IF;
    IF v_from IS NULL OR v_from > p.target_to THEN
     RAISE EXCEPTION USING ERRCODE='P2109', MESSAGE=format('Недопустимый интервал для строки Excel %s: %s — %s',p.excel_row,v_from,p.target_to);
    END IF;
    EXECUTE format('SELECT count(*) FROM %I WHERE source_record_id=$1 OR correction_reason=$2','model_'||p.entity||'_override') INTO v_count USING p.source_id,v_reason;
    IF v_count>1 THEN
     RAISE EXCEPTION USING ERRCODE='P2109', MESSAGE='Несколько существующих корректировок для одной строки ТЗ';
    ELSIF v_count=1 THEN
     EXECUTE format('SELECT model_id, source_record_id, %I AS value, effective_from, effective_to, correction_reason, is_final_override FROM %I WHERE source_record_id=$1 OR correction_reason=$2',p.entity,'model_'||p.entity||'_override') INTO ov USING p.source_id,v_reason;
     IF ov.model_id IS DISTINCT FROM p.model_id OR ov.source_record_id IS DISTINCT FROM p.source_id
        OR ov.value IS DISTINCT FROM p.value OR ov.effective_from IS DISTINCT FROM v_from
        OR ov.effective_to IS DISTINCT FROM p.target_to OR ov.correction_reason IS DISTINCT FROM v_reason
        OR ov.is_final_override IS DISTINCT FROM false THEN
      RAISE EXCEPTION USING ERRCODE='P2109', MESSAGE='Конфликт с существующей override; она не изменена';
     END IF;
     -- Точное совпадение нашей override: повторный запуск, вставка не нужна.
    ELSE
     IF p.source_id IS NOT NULL AND src.effective_to IS DISTINCT FROM TIMESTAMP '9999-12-31 23:59:59' THEN
      RAISE EXCEPTION USING ERRCODE='P2109', MESSAGE=format('Source %s уже закрыт: %s',p.source_id,src.effective_to);
     END IF;
     -- Не добавляем самостоятельную строку поверх уже существующего такого интервала.
     IF p.source_id IS NULL THEN
      EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I WHERE model_id=$1 AND %I=$2 AND effective_from=$3 AND effective_to=$4 UNION ALL SELECT 1 FROM %I WHERE model_id=$1 AND %I=$2 AND effective_from=$3 AND effective_to=$4)',
       'model_'||p.entity||'_source',p.entity,'model_'||p.entity||'_override',p.entity)
       INTO v_bad USING p.model_id,p.value,v_from,p.target_to;
      IF v_bad THEN
       RAISE EXCEPTION USING ERRCODE='P2109', MESSAGE='Эквивалентный самостоятельный интервал уже существует; нужна сверка';
      END IF;
     END IF;
     EXECUTE format('INSERT INTO %I(model_id,source_record_id,%I,effective_from,effective_to,correction_reason,is_final_override,author,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,false,current_user,current_timestamp(0),current_timestamp(0))',
      'model_'||p.entity||'_override',p.entity) USING p.model_id,p.source_id,p.value,v_from,p.target_to,v_reason;
     v_inserted := v_inserted+1;
    END IF;
   END LOOP;
   -- Реальный resolver пересчитывает обе сущности. Проверяем ссылки обеих таблиц.
   IF EXISTS (SELECT 1 FROM model_stage_override o WHERE o.model_id=g.model_id AND o.source_record_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM model_stage_source s WHERE s.id=o.source_record_id AND s.model_id=o.model_id))
      OR EXISTS (SELECT 1 FROM model_status_override o WHERE o.model_id=g.model_id AND o.source_record_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM model_status_source s WHERE s.id=o.source_record_id AND s.model_id=o.model_id)) THEN
    RAISE EXCEPTION USING ERRCODE='P2109', MESSAGE='У модели есть override с отсутствующей source-ссылкой';
   END IF;
   v_projection := $query$
    SELECT s.status, s.effective_from, s.effective_to FROM model_status_source s
    WHERE s.model_id=$1 AND NOT EXISTS (SELECT 1 FROM model_status_override o WHERE o.model_id=s.model_id AND o.source_record_id=s.id)
    UNION ALL SELECT o.status,o.effective_from,o.effective_to FROM model_status_override o WHERE o.model_id=$1
   $query$;
   EXECUTE 'SELECT count(*)>1 FROM ('||v_projection||') r WHERE effective_to=TIMESTAMP ''9999-12-31 23:59:59''' INTO v_bad USING g.model_id;
   IF v_bad THEN
    RAISE EXCEPTION USING ERRCODE='P2109', MESSAGE='После корректировок остаётся более одного открытого статуса';
   END IF;
   IF v_inserted>0 THEN
    -- Явный enqueue. Счётчики attempts этой миграцией не изменяются.
    INSERT INTO model_recalc_queue(model_id,updated_at,sources,last_event)
    VALUES(g.model_id,now(),ARRAY['model_'||g.entity||'_override'],
     jsonb_build_object('table','model_recalc_queue','op','UPDATE','at',now(),'row_id',NULL,'model_id',g.model_id,'source_system',NULL))
    ON CONFLICT(model_id) DO UPDATE SET updated_at=EXCLUDED.updated_at,
     sources=ARRAY(SELECT DISTINCT unnest(model_recalc_queue.sources||EXCLUDED.sources)),
     last_event=EXCLUDED.last_event,next_attempt_at=NULL,last_error=NULL,last_error_at=NULL;
    PERFORM pg_notify('model_recalc',g.model_id);
   END IF;
   INSERT INTO sum21092026_report VALUES(g.entity,g.model_id,CASE WHEN v_inserted=0 THEN 'ALREADY_APPLIED' ELSE 'APPLIED' END,v_inserted,NULL);
  EXCEPTION WHEN SQLSTATE 'P2109' THEN
   INSERT INTO sum21092026_report VALUES(g.entity,g.model_id,'SKIPPED',0,SQLERRM);
   RAISE WARNING 'SUM-21092026 % / %: %',g.entity,g.model_id,SQLERRM;
  END;
 END LOOP;
END;
$migration$;
SELECT * FROM sum21092026_report ORDER BY entity,model_id;
SELECT result,count(*) AS groups,sum(inserted_count) AS inserted_rows FROM sum21092026_report GROUP BY result ORDER BY result;
`
