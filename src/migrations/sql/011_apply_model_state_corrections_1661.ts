// Транзакцией и журналом выполнения управляет StartupSqlMigrationService.
export const applyModelStateCorrections1661Sql = `
-- SUM-1661. Актуальное ТЗ + уточнения пользователя.
-- Выполняется StartupSqlMigrationService в транзакции СУМ. Source/final не изменяются.
-- Для закрытия начало читается из БД, окончание — из плана ниже.
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
LOCK TABLE model_recalc_queue IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE model_stage_source, model_status_source IN SHARE MODE;
LOCK TABLE model_stage_override, model_status_override IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE sum1661_actual_plan (
 entity text, model_id text, excel_row integer, source_id integer,
 value text, excel_from timestamp, target_to timestamp
) ON COMMIT DROP;
INSERT INTO sum1661_actual_plan VALUES
('stage', 'c0df893d-680e-11ee-9d0f-0a5801010611', 2, 7429, 'Вывод модели из эксплуатации', TIMESTAMP '2026-08-24 18:36:17', TIMESTAMP '2026-08-24 18:58:00'),
('stage', 'd4ae574d-0c22-11ed-8325-0a580107050e', 3, 7512, 'Вывод модели из эксплуатации', TIMESTAMP '2026-09-01 23:49:27', TIMESTAMP '2026-09-02 11:56:00'),
('stage', 'fb1a3818-70e3-11ed-a9f8-0a5801050287', 4, 1356, 'Вывод модели из эксплуатации', TIMESTAMP '2025-12-09 18:07:08', TIMESTAMP '2025-12-19 22:09:00'),
('stage', '33cd2eb6-7438-11ef-b31b-32eed338898a', 5, 3034, 'Полная валидация', TIMESTAMP '2024-12-13 11:40:00', TIMESTAMP '2026-09-07 16:55:00'),
('stage', '6675a5d1-6967-11f1-bb42-de19930c7197', 6, NULL, 'Продуктивизация модели', TIMESTAMP '2026-09-14 18:34:00', TIMESTAMP '9999-12-31 23:59:59'),
('status', 'c0df893d-680e-11ee-9d0f-0a5801010611', 2, 3756, 'В процессе разработки', TIMESTAMP '2026-03-05 09:07:03.480000', TIMESTAMP '2026-08-24 18:58:00'),
('status', 'c0df893d-680e-11ee-9d0f-0a5801010611', 3, NULL, 'Архив', TIMESTAMP '2026-08-24 18:58:00', TIMESTAMP '9999-12-31 23:59:59'),
('status', 'd4ae574d-0c22-11ed-8325-0a580107050e', 4, 6336, 'Внедрена в ПИМ', TIMESTAMP '2026-08-24 08:55:39', TIMESTAMP '2026-09-02 11:56:00'),
('status', 'd4ae574d-0c22-11ed-8325-0a580107050e', 5, NULL, 'Архив', TIMESTAMP '2026-09-02 11:56:00', TIMESTAMP '9999-12-31 23:59:59'),
('status', '70cd279e-9253-11f1-9626-a6ce09b86072', 6, 6279, 'В процессе разработки', TIMESTAMP '2026-08-07 14:30:56', TIMESTAMP '2026-09-02 15:31:00'),
('status', '70cd279e-9253-11f1-9626-a6ce09b86072', 7, NULL, 'Разработана, в процессе внедрения', TIMESTAMP '2026-09-02 15:31:00', TIMESTAMP '9999-12-31 23:59:59'),
('status', '6675a5d1-6967-11f1-bb42-de19930c7197', 8, 5944, 'В процессе разработки', TIMESTAMP '2026-06-16 12:40:30', TIMESTAMP '2026-09-14 18:34:00'),
('status', '6675a5d1-6967-11f1-bb42-de19930c7197', 9, NULL, 'Разработана, в процессе внедрения', TIMESTAMP '2026-09-14 18:34:00', TIMESTAMP '9999-12-31 23:59:59');

CREATE TEMP TABLE sum1661_actual_report (
 entity text, model_id text, result text, inserted_count integer, detail text
) ON COMMIT DROP;
DO $migration$
DECLARE
 g record; p record; src record; ov record;
 v_from timestamp; v_reason text; v_count integer; v_inserted integer;
 v_projection text; v_bad boolean;
BEGIN
 FOR g IN SELECT DISTINCT entity, model_id FROM sum1661_actual_plan ORDER BY entity, model_id LOOP
  v_inserted := 0;
  -- Подтранзакция: закрытие и новый статус откатываются вместе при несовпадении данных.
  BEGIN
   IF NOT EXISTS (SELECT 1 FROM models m WHERE m.model_id=g.model_id) THEN
    RAISE EXCEPTION USING ERRCODE='P1661', MESSAGE='Модель отсутствует в models';
   END IF;
   FOR p IN SELECT * FROM sum1661_actual_plan x WHERE x.entity=g.entity AND x.model_id=g.model_id ORDER BY excel_row LOOP
    v_reason := 'SUM-1661 actual / ' || p.entity || ' / row ' || p.excel_row;
    v_from := p.excel_from;
    IF p.source_id IS NOT NULL THEN
     EXECUTE format('SELECT model_id, %I AS value, effective_from, effective_to FROM %I WHERE id=$1',p.entity,'model_'||p.entity||'_source') INTO src USING p.source_id;
     IF src.model_id IS DISTINCT FROM p.model_id OR src.value IS DISTINCT FROM p.value THEN
      RAISE EXCEPTION USING ERRCODE='P1661', MESSAGE=format('Source %s отсутствует или принадлежит другой модели/значению',p.source_id);
     END IF;
     v_from := src.effective_from;
    END IF;
    IF v_from IS NULL OR v_from > p.target_to THEN
     RAISE EXCEPTION USING ERRCODE='P1661', MESSAGE=format('Недопустимый интервал для строки Excel %s: %s — %s',p.excel_row,v_from,p.target_to);
    END IF;
    EXECUTE format('SELECT count(*) FROM %I WHERE source_record_id=$1 OR correction_reason=$2','model_'||p.entity||'_override') INTO v_count USING p.source_id,v_reason;
    IF v_count>1 THEN
     RAISE EXCEPTION USING ERRCODE='P1661', MESSAGE='Несколько существующих корректировок для одной строки ТЗ';
    ELSIF v_count=1 THEN
     EXECUTE format('SELECT model_id, source_record_id, %I AS value, effective_from, effective_to, correction_reason, is_final_override FROM %I WHERE source_record_id=$1 OR correction_reason=$2',p.entity,'model_'||p.entity||'_override') INTO ov USING p.source_id,v_reason;
     IF ov.model_id IS DISTINCT FROM p.model_id OR ov.source_record_id IS DISTINCT FROM p.source_id
        OR ov.value IS DISTINCT FROM p.value OR ov.effective_from IS DISTINCT FROM v_from
        OR ov.effective_to IS DISTINCT FROM p.target_to OR ov.correction_reason IS DISTINCT FROM v_reason
        OR ov.is_final_override IS DISTINCT FROM false THEN
      RAISE EXCEPTION USING ERRCODE='P1661', MESSAGE='Конфликт с существующей override; она не изменена';
     END IF;
     -- Точное совпадение нашей override: повторный запуск, вставка не нужна.
    ELSE
     IF p.source_id IS NOT NULL AND src.effective_to IS DISTINCT FROM TIMESTAMP '9999-12-31 23:59:59' THEN
      RAISE EXCEPTION USING ERRCODE='P1661', MESSAGE=format('Source %s уже закрыт: %s',p.source_id,src.effective_to);
     END IF;
     -- Не добавляем самостоятельную строку поверх уже существующего такого интервала.
     IF p.source_id IS NULL THEN
      EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I WHERE model_id=$1 AND %I=$2 AND effective_from=$3 AND effective_to=$4 UNION ALL SELECT 1 FROM %I WHERE model_id=$1 AND %I=$2 AND effective_from=$3 AND effective_to=$4)',
       'model_'||p.entity||'_source',p.entity,'model_'||p.entity||'_override',p.entity)
       INTO v_bad USING p.model_id,p.value,v_from,p.target_to;
      IF v_bad THEN
       RAISE EXCEPTION USING ERRCODE='P1661', MESSAGE='Эквивалентный самостоятельный интервал уже существует; нужна сверка';
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
    RAISE EXCEPTION USING ERRCODE='P1661', MESSAGE='У модели есть override с отсутствующей source-ссылкой';
   END IF;
   v_projection := $query$
    SELECT s.status, s.effective_from, s.effective_to FROM model_status_source s
    WHERE s.model_id=$1 AND NOT EXISTS (SELECT 1 FROM model_status_override o WHERE o.model_id=s.model_id AND o.source_record_id=s.id)
    UNION ALL SELECT o.status,o.effective_from,o.effective_to FROM model_status_override o WHERE o.model_id=$1
   $query$;
   EXECUTE 'SELECT count(*)>1 FROM ('||v_projection||') r WHERE effective_to=TIMESTAMP ''9999-12-31 23:59:59''' INTO v_bad USING g.model_id;
   IF v_bad THEN
    RAISE EXCEPTION USING ERRCODE='P1661', MESSAGE='После корректировок остаётся более одного открытого статуса';
   END IF;
   IF v_inserted>0 THEN
    -- Явный enqueue; attempts сбрасывается отдельным скриптом 02.
    INSERT INTO model_recalc_queue(model_id,updated_at,sources,last_event)
    VALUES(g.model_id,now(),ARRAY['model_'||g.entity||'_override'],
     jsonb_build_object('table','model_recalc_queue','op','UPDATE','at',now(),'row_id',NULL,'model_id',g.model_id,'source_system',NULL))
    ON CONFLICT(model_id) DO UPDATE SET updated_at=EXCLUDED.updated_at,
     sources=ARRAY(SELECT DISTINCT unnest(model_recalc_queue.sources||EXCLUDED.sources)),
     last_event=EXCLUDED.last_event,next_attempt_at=NULL,last_error=NULL,last_error_at=NULL;
    PERFORM pg_notify('model_recalc',g.model_id);
   END IF;
   INSERT INTO sum1661_actual_report VALUES(g.entity,g.model_id,CASE WHEN v_inserted=0 THEN 'ALREADY_APPLIED' ELSE 'APPLIED' END,v_inserted,NULL);
  EXCEPTION WHEN SQLSTATE 'P1661' THEN
   INSERT INTO sum1661_actual_report VALUES(g.entity,g.model_id,'SKIPPED',0,SQLERRM);
   RAISE WARNING 'SUM-1661 % / %: %',g.entity,g.model_id,SQLERRM;
  END;
 END LOOP;
END;
$migration$;
SELECT * FROM sum1661_actual_report ORDER BY entity,model_id;
SELECT result,count(*) AS groups,sum(inserted_count) AS inserted_rows FROM sum1661_actual_report GROUP BY result ORDER BY result;
`
