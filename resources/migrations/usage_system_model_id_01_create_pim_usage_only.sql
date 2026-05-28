-- =============================================================================
-- Создание таблицы models_pim_usage (PIM usage по кварталам).
-- Идемпотентно: CREATE TABLE IF NOT EXISTS.
-- Схема: как у models_usage, если таблица есть; иначе public.
--
-- Бэкенд: PimUsageService (ON CONFLICT по system_model_id + квартал + год).
-- =============================================================================

DO $$
DECLARE
  v_schema name;
BEGIN
  SELECT n.nspname INTO v_schema
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relname = 'models_usage' AND c.relkind = 'r'
  ORDER BY (n.nspname = current_schema()) DESC, n.nspname
  LIMIT 1;

  IF v_schema IS NULL THEN
    v_schema := 'public';
  END IF;

  EXECUTE format('SET LOCAL search_path TO %I, public, pg_catalog', v_schema);

  EXECUTE format($sql$
    CREATE TABLE IF NOT EXISTS %I.models_pim_usage (
      pim_usage_id         SERIAL PRIMARY KEY,
      system_model_id      VARCHAR(255) NOT NULL,
      confirmation_quarter INTEGER NOT NULL CHECK (confirmation_quarter BETWEEN 1 AND 4),
      confirmation_year    INTEGER NOT NULL,
      is_used              BOOLEAN DEFAULT FALSE,
      source_system        VARCHAR(100) DEFAULT 'PIM',
      create_date          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      update_date          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT models_pim_usage_smid_q_y_key UNIQUE (system_model_id, confirmation_quarter, confirmation_year)
    )
  $sql$, v_schema);

  RAISE NOTICE 'models_pim_usage ensured in schema %', v_schema;
END $$;
