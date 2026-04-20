-- =============================================================================
-- Миграция: квартальное подтверждение использования моделей (единый скрипт)
-- Файл: usage_system_model_id_01_create_pim_usage_only.sql
--
--   1) models_pim_usage в схеме как у models_usage (иначе public)
--   2) недостающие колонки MRM на models_usage / models_usage_history
--   3) только models_pim_usage: колонка system_model_id и миграция с legacy model_id (при необходимости)
--      models_usage / models_usage_history остаются на model_id — без system_model_id
--   4) индексы/NOT NULL для models_pim_usage, итоговый SUMMARY
--
-- Failsafe:
--   * Идемпотентна — безопасно запускать повторно.
--   * Явных COMMIT/BEGIN нет (autocommit / «no transaction in progress»).
--
-- Предположения:
--   * models_new.model_id — PK (= system_model_id)
--   * artefact_realizations_new: artefact_id = 2001, effective_to = 9999-12-31 23:59:59
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== MIGRATION START: usage_system_model_id_01 ===';
  RAISE NOTICE 'current_database=% current_user=% current_schema=% search_path=%',
    current_database(), current_user, current_schema(), current_setting('search_path');
END $$;

-- --- 1) models_pim_usage: создать при отсутствии в той же схеме, что и models_usage ---
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
      system_model_id      VARCHAR(255),
      confirmation_quarter INTEGER NOT NULL CHECK (confirmation_quarter BETWEEN 1 AND 4),
      confirmation_year    INTEGER NOT NULL,
      is_used              BOOLEAN DEFAULT FALSE,
      source_system        VARCHAR(100) DEFAULT 'PIM',
      create_date          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      update_date          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  $sql$, v_schema);

  RAISE NOTICE 'STEP 1: ensured %I.models_pim_usage (search_path=%)', v_schema, current_setting('search_path');
END $$;

-- --- 1b) Колонки, которые ожидает MRM-бэкенд (mrm-usage, quarterly-confirmation) ---
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

  IF to_regclass('models_usage') IS NOT NULL THEN
    EXECUTE format($sql$
      ALTER TABLE %I.%I
        ADD COLUMN IF NOT EXISTS confirmation_date DATE,
        ADD COLUMN IF NOT EXISTS confirmation_year INTEGER,
        ADD COLUMN IF NOT EXISTS confirmation_quarter INTEGER,
        ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS creator VARCHAR(255),
        ADD COLUMN IF NOT EXISTS create_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS update_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    $sql$, v_schema, 'models_usage');
    RAISE NOTICE 'STEP 1b: ensured MRM columns on %I.models_usage', v_schema;
  ELSE
    RAISE NOTICE 'STEP 1b: models_usage missing -> column ensure skipped';
  END IF;

  IF to_regclass('models_usage_history') IS NOT NULL THEN
    EXECUTE format($sql$
      ALTER TABLE %I.%I
        ADD COLUMN IF NOT EXISTS confirmation_date DATE,
        ADD COLUMN IF NOT EXISTS change_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS changed_by VARCHAR(255)
    $sql$, v_schema, 'models_usage_history');
    RAISE NOTICE 'STEP 1b: ensured MRM columns on %I.models_usage_history', v_schema;
  ELSE
    RAISE NOTICE 'STEP 1b: models_usage_history missing -> column ensure skipped';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- STEP 2: только models_pim_usage — system_model_id / снятие legacy model_id
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_schema        name;
  v_table         text;
  v_qualified     text;
  v_missing_count bigint;
  v_has_model_id  boolean;
  v_has_smid      boolean;
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

  RAISE NOTICE 'STEP 2: models_pim_usage only (schema=%)', v_schema;

  FOREACH v_table IN ARRAY ARRAY['models_pim_usage']
  LOOP
    v_qualified := format('%I.%I', v_schema, v_table);

    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = v_schema AND c.relname = v_table AND c.relkind = 'r'
    ) THEN
      RAISE NOTICE '[%] table % not found, skipping entirely', v_table, v_qualified;
      CONTINUE;
    END IF;

    RAISE NOTICE '[%] processing table %', v_table, v_qualified;

    EXECUTE format(
      'ALTER TABLE %s ADD COLUMN IF NOT EXISTS system_model_id VARCHAR(255)',
      v_qualified
    );
    RAISE NOTICE '[%]   + ADD COLUMN system_model_id (if not exists) done', v_table;

    EXECUTE format($f$
      SELECT EXISTS (
        SELECT 1 FROM pg_attribute
        WHERE attrelid = %L::regclass AND attname = 'model_id' AND NOT attisdropped
      )
    $f$, v_qualified) INTO v_has_model_id;

    IF v_has_model_id THEN
      RAISE NOTICE '[%]   legacy column model_id present -> backfilling system_model_id', v_table;
      EXECUTE format($f$
        UPDATE %s t
        SET system_model_id = ar.model_id
        FROM artefact_realizations_new ar
        WHERE ar.artefact_id = 2001
          AND ar.effective_to = TIMESTAMP '9999-12-31 23:59:59'
          AND ar.artefact_string_value = t.model_id
          AND t.system_model_id IS NULL
      $f$, v_qualified);

      EXECUTE format(
        'SELECT count(*) FROM %s WHERE system_model_id IS NULL AND model_id IS NOT NULL',
        v_qualified
      ) INTO v_missing_count;
      RAISE NOTICE '[%]   unmapped rows after backfill: %', v_table, v_missing_count;

      IF v_missing_count > 0 THEN
        RAISE NOTICE
          '[%]   keeping legacy model_id column and skipping destructive steps (% unmapped rows)',
          v_table, v_missing_count;
      ELSE
        IF v_table = 'models_pim_usage' THEN
          EXECUTE format(
            'ALTER TABLE %s DROP CONSTRAINT IF EXISTS models_pim_usage_model_id_confirmation_quarter_confirmation_year_key',
            v_qualified
          );
        END IF;
        EXECUTE format('DROP INDEX IF EXISTS %I.idx_%I_model_id', v_schema, v_table);

        EXECUTE format('ALTER TABLE %s DROP COLUMN IF EXISTS model_id', v_qualified);
        RAISE NOTICE '[%]   - DROP legacy column model_id done', v_table;
      END IF;
    ELSE
      RAISE NOTICE '[%]   no legacy model_id column, nothing to backfill', v_table;
    END IF;

    EXECUTE format($f$
      SELECT EXISTS (
        SELECT 1 FROM pg_attribute
        WHERE attrelid = %L::regclass AND attname = 'system_model_id' AND NOT attisdropped
      )
    $f$, v_qualified) INTO v_has_smid;
    RAISE NOTICE '[%]   after step: system_model_id present = %', v_table, v_has_smid;
  END LOOP;
  RAISE NOTICE 'STEP 2: per-table backfill loop done';
END
$$;

-- --- STEP 3: indexes/constraints on system_model_id -------------------------
DO $$ BEGIN RAISE NOTICE 'STEP 3: indexes/constraints on system_model_id'; END $$;

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

  IF to_regclass('models_pim_usage') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_attribute
                 WHERE attrelid = format('%I.%I', v_schema, 'models_pim_usage')::regclass
                   AND attname = 'system_model_id' AND NOT attisdropped) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE c.conname = 'models_pim_usage_smid_q_y_key'
        AND n.nspname = v_schema
    ) THEN
      ALTER TABLE models_pim_usage
        ADD CONSTRAINT models_pim_usage_smid_q_y_key
        UNIQUE (system_model_id, confirmation_quarter, confirmation_year);
      RAISE NOTICE '  + unique constraint models_pim_usage_smid_q_y_key added';
    ELSE
      RAISE NOTICE '  = unique constraint models_pim_usage_smid_q_y_key already present';
    END IF;

    CREATE INDEX IF NOT EXISTS idx_models_pim_usage_smid
      ON models_pim_usage (system_model_id);
    CREATE INDEX IF NOT EXISTS idx_models_pim_usage_quarter_year
      ON models_pim_usage (confirmation_quarter, confirmation_year);
    RAISE NOTICE '  + models_pim_usage supporting indexes ensured';
  ELSE
    RAISE NOTICE '  ! models_pim_usage.system_model_id missing -> constraints skipped';
  END IF;
END
$$;

-- --- STEP 4: SET NOT NULL on system_model_id (best-effort) ------------------
DO $$ BEGIN RAISE NOTICE 'STEP 4: SET NOT NULL on system_model_id (best-effort)'; END $$;
DO $$
DECLARE
  v_schema        name;
  v_missing_count bigint;
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

  IF to_regclass('models_pim_usage') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_attribute
                 WHERE attrelid = format('%I.%I', v_schema, 'models_pim_usage')::regclass
                   AND attname = 'system_model_id' AND NOT attisdropped) THEN
    SELECT count(*)
    INTO v_missing_count
    FROM models_pim_usage
    WHERE system_model_id IS NULL;

    IF v_missing_count = 0 THEN
      ALTER TABLE models_pim_usage ALTER COLUMN system_model_id SET NOT NULL;
      RAISE NOTICE '  + models_pim_usage.system_model_id -> NOT NULL';
    ELSE
      RAISE NOTICE '  - models_pim_usage SET NOT NULL skipped: % NULL rows remain', v_missing_count;
    END IF;
  ELSE
    RAISE NOTICE '  ! models_pim_usage.system_model_id missing -> SET NOT NULL skipped';
  END IF;
END
$$;

-- --- SUMMARY -----------------------------------------------------------------
DO $$
DECLARE
  v_schema    name;
  v_table     text;
  v_qualified text;
  v_has_mid   boolean;
  v_has_smid  boolean;
  v_nulls     bigint;
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

  RAISE NOTICE '=== MIGRATION SUMMARY (schema=%) ===', v_schema;

  FOREACH v_table IN ARRAY ARRAY['models_usage', 'models_usage_history', 'models_pim_usage']
  LOOP
    v_qualified := format('%I.%I', v_schema, v_table);

    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = v_schema AND c.relname = v_table AND c.relkind = 'r'
    ) THEN
      RAISE NOTICE '[%] table % does not exist', v_table, v_qualified;
      CONTINUE;
    END IF;

    EXECUTE format($f$
      SELECT EXISTS (SELECT 1 FROM pg_attribute
                     WHERE attrelid = %L::regclass AND attname = 'model_id' AND NOT attisdropped)
    $f$, v_qualified) INTO v_has_mid;
    EXECUTE format($f$
      SELECT EXISTS (SELECT 1 FROM pg_attribute
                     WHERE attrelid = %L::regclass AND attname = 'system_model_id' AND NOT attisdropped)
    $f$, v_qualified) INTO v_has_smid;

    IF v_has_smid THEN
      EXECUTE format('SELECT count(*) FROM %s WHERE system_model_id IS NULL', v_qualified)
        INTO v_nulls;
    ELSE
      v_nulls := NULL;
    END IF;

    RAISE NOTICE '[%] qualified=% model_id=% system_model_id=% nulls_in_smid=%',
      v_table, v_qualified, v_has_mid, v_has_smid, v_nulls;
  END LOOP;
  RAISE NOTICE '=== MIGRATION END: usage_system_model_id_01 ===';
END
$$;
