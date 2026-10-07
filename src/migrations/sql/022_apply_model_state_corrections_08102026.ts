// Транзакцией и журналом выполнения управляет StartupSqlMigrationService.
export const applyModelStateCorrections08102026Sql = `
-- Источник: Таблица корректировок 08102026.xlsx, листы Этап и Статус.
-- Выполняется StartupSqlMigrationService в транзакции СУМ. Source/final не изменяются.
-- Для закрытия начало читается из БД, окончание — из плана ниже.
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
LOCK TABLE model_recalc_queue IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE model_stage_source, model_status_source IN SHARE MODE;
LOCK TABLE model_stage_override, model_status_override IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE sum08102026_plan (
 entity text, model_id text, excel_row integer, source_id integer,
 value text, excel_from timestamp, target_to timestamp
) ON COMMIT DROP;
INSERT INTO sum08102026_plan VALUES
('stage', 'c46815d6-b950-11eb-8c85-0242ac11000d', 2, 4661, 'Разработка модели', TIMESTAMP '2021-12-29 14:31:50', TIMESTAMP '2024-11-18 18:00:00'),
('stage', '36b4b5d0-e770-11ee-a31a-0a58010403d1', 3, 7189, 'Продуктивизация модели', TIMESTAMP '2026-07-24 15:51:16.000', TIMESTAMP '2026-07-24 15:52:00'),
('stage', '36b4b5d0-e770-11ee-a31a-0a58010403d1', 4, 6980, 'Настройка среды применения модели', TIMESTAMP '2026-07-03 12:45:51.000', TIMESTAMP '2026-07-24 15:52:00'),
('stage', '36b4b5d0-e770-11ee-a31a-0a58010403d1', 5, NULL, 'Полная валидация', TIMESTAMP '2026-07-24 15:52:00', TIMESTAMP '9999-12-31 23:59:59.000'),
('stage', 'f8139e5b-ed17-11ee-a31a-0a58010403d1', 6, 7684, 'Вывод из эксплуатации', TIMESTAMP '2026-09-14 16:34:33.000', TIMESTAMP '2026-09-14 16:34:34.000'),
('status', '614906f0-b748-11f1-98c1-8aae75d98f65', 2, 6582, 'В процессе разработки', TIMESTAMP '2026-09-23 15:15:00', TIMESTAMP '2026-09-25 16:36:38'),
('status', '614906f0-b748-11f1-98c1-8aae75d98f65', 3, NULL, 'Разработана, не внедрена', TIMESTAMP '2026-09-25 16:36:38', TIMESTAMP '9999-12-31 23:59:59.000'),
('status', 'c46815d6-b950-11eb-8c85-0242ac11000d', 4, 3590, 'В процессе разработки', TIMESTAMP '2023-07-06 14:43:18', TIMESTAMP '2024-11-18 18:00:00'),
('status', '36b4b5d0-e770-11ee-a31a-0a58010403d1', 5, 6043, 'Разработана, в процессе внедрения', TIMESTAMP '2026-06-25 11:35:41.000', TIMESTAMP '2026-07-24 15:52:00'),
('status', '36b4b5d0-e770-11ee-a31a-0a58010403d1', 6, NULL, 'Внедрена в ПИМ', TIMESTAMP '2026-07-24 15:52:00', TIMESTAMP '9999-12-31 23:59:59.000');

CREATE TEMP TABLE sum08102026_report (
 entity text, model_id text, result text, inserted_count integer, detail text
) ON COMMIT DROP;
DO $migration$
DECLARE
 g record; p record; src record; ov record;
 v_from timestamp; v_reason text; v_count integer; v_inserted integer;
 v_projection text; v_bad boolean;
BEGIN
 FOR g IN SELECT DISTINCT entity, model_id FROM sum08102026_plan ORDER BY entity, model_id LOOP
  v_inserted := 0;
  -- Подтранзакция: закрытие и новый статус откатываются вместе при несовпадении данных.
  BEGIN
   IF NOT EXISTS (SELECT 1 FROM models m WHERE m.model_id=g.model_id) THEN
    RAISE EXCEPTION USING ERRCODE='P0810', MESSAGE='Модель отсутствует в models';
   END IF;
   FOR p IN SELECT * FROM sum08102026_plan x WHERE x.entity=g.entity AND x.model_id=g.model_id ORDER BY excel_row LOOP
    v_reason := 'SUM-08102026 / ' || p.entity || ' / row ' || p.excel_row;
    v_from := p.excel_from;
    IF p.source_id IS NOT NULL THEN
     EXECUTE format('SELECT model_id, %I AS value, effective_from, effective_to FROM %I WHERE id=$1',p.entity,'model_'||p.entity||'_source') INTO src USING p.source_id;
     IF src.model_id IS DISTINCT FROM p.model_id OR src.value IS DISTINCT FROM p.value THEN
      RAISE EXCEPTION USING ERRCODE='P0810', MESSAGE=format('Source %s отсутствует или принадлежит другой модели/значению',p.source_id);
     END IF;
     v_from := src.effective_from;
    END IF;
    IF v_from IS NULL OR v_from > p.target_to THEN
     RAISE EXCEPTION USING ERRCODE='P0810', MESSAGE=format('Недопустимый интервал для строки Excel %s: %s — %s',p.excel_row,v_from,p.target_to);
    END IF;
    EXECUTE format('SELECT count(*) FROM %I WHERE source_record_id=$1 OR correction_reason=$2','model_'||p.entity||'_override') INTO v_count USING p.source_id,v_reason;
    IF v_count>1 THEN
     RAISE EXCEPTION USING ERRCODE='P0810', MESSAGE='Несколько существующих корректировок для одной строки ТЗ';
    ELSIF v_count=1 THEN
     EXECUTE format('SELECT model_id, source_record_id, %I AS value, effective_from, effective_to, correction_reason, is_final_override FROM %I WHERE source_record_id=$1 OR correction_reason=$2',p.entity,'model_'||p.entity||'_override') INTO ov USING p.source_id,v_reason;
     IF ov.model_id IS DISTINCT FROM p.model_id OR ov.source_record_id IS DISTINCT FROM p.source_id
        OR ov.value IS DISTINCT FROM p.value OR ov.effective_from IS DISTINCT FROM v_from
        OR ov.effective_to IS DISTINCT FROM p.target_to OR ov.correction_reason IS DISTINCT FROM v_reason
        OR ov.is_final_override IS DISTINCT FROM false THEN
      RAISE EXCEPTION USING ERRCODE='P0810', MESSAGE='Конфликт с существующей override; она не изменена';
     END IF;
     -- Точное совпадение нашей override: повторный запуск, вставка не нужна.
    ELSE
     IF p.source_id IS NOT NULL AND src.effective_to IS DISTINCT FROM TIMESTAMP '9999-12-31 23:59:59' THEN
      RAISE EXCEPTION USING ERRCODE='P0810', MESSAGE=format('Source %s уже закрыт: %s',p.source_id,src.effective_to);
     END IF;
     -- Не добавляем самостоятельную строку поверх уже существующего такого интервала.
     IF p.source_id IS NULL THEN
      EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I WHERE model_id=$1 AND %I=$2 AND effective_from=$3 AND effective_to=$4 UNION ALL SELECT 1 FROM %I WHERE model_id=$1 AND %I=$2 AND effective_from=$3 AND effective_to=$4)',
       'model_'||p.entity||'_source',p.entity,'model_'||p.entity||'_override',p.entity)
       INTO v_bad USING p.model_id,p.value,v_from,p.target_to;
      IF v_bad THEN
       RAISE EXCEPTION USING ERRCODE='P0810', MESSAGE='Эквивалентный самостоятельный интервал уже существует; нужна сверка';
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
    RAISE EXCEPTION USING ERRCODE='P0810', MESSAGE='У модели есть override с отсутствующей source-ссылкой';
   END IF;
   v_projection := $query$
    SELECT s.status, s.effective_from, s.effective_to FROM model_status_source s
    WHERE s.model_id=$1 AND NOT EXISTS (SELECT 1 FROM model_status_override o WHERE o.model_id=s.model_id AND o.source_record_id=s.id)
    UNION ALL SELECT o.status,o.effective_from,o.effective_to FROM model_status_override o WHERE o.model_id=$1
   $query$;
   EXECUTE 'SELECT count(*)>1 FROM ('||v_projection||') r WHERE effective_to=TIMESTAMP ''9999-12-31 23:59:59''' INTO v_bad USING g.model_id;
   IF v_bad THEN
    RAISE EXCEPTION USING ERRCODE='P0810', MESSAGE='После корректировок остаётся более одного открытого статуса';
   END IF;
   IF v_inserted>0 THEN
    -- Повторный пересчёт только изменённых моделей, включая исчерпавшие attempts.
    INSERT INTO model_recalc_queue(model_id,updated_at,sources,last_event)
    VALUES(g.model_id,now(),ARRAY['model_'||g.entity||'_override'],
     jsonb_build_object('table','model_recalc_queue','op','UPDATE','at',now(),'row_id',NULL,'model_id',g.model_id,'source_system',NULL))
    ON CONFLICT(model_id) DO UPDATE SET updated_at=EXCLUDED.updated_at,
     sources=ARRAY(SELECT DISTINCT unnest(model_recalc_queue.sources||EXCLUDED.sources)),
     last_event=EXCLUDED.last_event,attempts=0,next_attempt_at=NULL,last_error=NULL,last_error_at=NULL;
    PERFORM pg_notify('model_recalc',g.model_id);
   END IF;
   INSERT INTO sum08102026_report VALUES(g.entity,g.model_id,CASE WHEN v_inserted=0 THEN 'ALREADY_APPLIED' ELSE 'APPLIED' END,v_inserted,NULL);
  EXCEPTION WHEN SQLSTATE 'P0810' THEN
   INSERT INTO sum08102026_report VALUES(g.entity,g.model_id,'SKIPPED',0,SQLERRM);
   RAISE WARNING 'SUM-08102026 % / %: %',g.entity,g.model_id,SQLERRM;
  END;
 END LOOP;
END;
$migration$;
SELECT * FROM sum08102026_report ORDER BY entity,model_id;
SELECT result,count(*) AS groups,sum(inserted_count) AS inserted_rows FROM sum08102026_report GROUP BY result ORDER BY result;
`
