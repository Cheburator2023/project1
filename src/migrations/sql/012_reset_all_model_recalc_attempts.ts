// Транзакцией и журналом выполнения управляет StartupSqlMigrationService.
export const resetAllModelRecalcAttemptsSql = `
-- Отдельная операция по запросу пользователя: ВСЯ очередь, без фильтра моделей.
-- Сохраняем next_attempt_at и диагностику ошибок. Это сброс счётчика, не немедленный запуск.
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
LOCK TABLE model_recalc_queue IN SHARE ROW EXCLUSIVE MODE;
WITH changed AS (
 UPDATE model_recalc_queue SET attempts=0 WHERE attempts IS DISTINCT FROM 0
 RETURNING model_id
)
SELECT count(*) AS reset_models FROM changed;
SELECT count(*) AS queue_models, count(*) FILTER (WHERE attempts<>0) AS nonzero_attempts FROM model_recalc_queue;
SELECT pg_notify('model_recalc','');
`
