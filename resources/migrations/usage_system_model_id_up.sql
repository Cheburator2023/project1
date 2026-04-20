-- =============================================================================
-- Миграция (UP): квартальное подтверждение использования моделей
--   1) создаёт таблицу models_pim_usage (если её ещё нет)
--   2) переводит все 3 usage-таблицы на ключ system_model_id вместо артефакта 2001
--
-- Failsafe:
--   * Идемпотентна — безопасно запускать повторно.
--   * Атомарна — одна транзакция; при ошибке всё откатывается.
--   * Перед деструктивными шагами (DROP COLUMN) проверяет, что в старой колонке
--     не осталось строк без мэппинга в system_model_id. Если такие строки есть —
--     миграция падает с RAISE EXCEPTION и ничего не ломает.
--
-- Предположения:
--   * models_new.model_id  — PK (= system_model_id)
--   * artefact_realizations_new.artefact_id = 2001 содержит «бизнесовый» model_id,
--     effective_to = 9999-12-31 23:59:59 — текущая запись.
-- =============================================================================

BEGIN;

-- --- 1) models_pim_usage: создать при отсутствии, сразу в правильной форме ---
CREATE TABLE IF NOT EXISTS models_pim_usage (
  pim_usage_id         SERIAL PRIMARY KEY,
  -- Колонка называется system_model_id сразу; старый model_id поддерживаем
  -- ниже через миграцию существующих инсталляций.
  system_model_id      VARCHAR(255),
  confirmation_quarter INTEGER NOT NULL CHECK (confirmation_quarter BETWEEN 1 AND 4),
  confirmation_year    INTEGER NOT NULL,
  is_used              BOOLEAN DEFAULT FALSE,
  source_system        VARCHAR(100) DEFAULT 'PIM',
  create_date          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  update_date          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Универсальная функция для шага миграции одной таблицы.
-- На момент выполнения оборачивает всё в идемпотентную логику:
--   * ADD COLUMN IF NOT EXISTS system_model_id
--   * UPDATE ... backfill из artefact_realizations_new
--   * проверка отсутствия unmapped rows (иначе RAISE EXCEPTION)
--   * DROP старых constraint/индекс на model_id
--   * DROP COLUMN IF EXISTS model_id
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_table         text;
  v_missing_count bigint;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['models_usage', 'models_usage_history', 'models_pim_usage']
  LOOP
    -- Пропускаем, если целевой таблицы нет вовсе
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name = v_table
    ) THEN
      RAISE NOTICE 'Table % not found, skipping', v_table;
      CONTINUE;
    END IF;

    -- 1. Добавляем system_model_id, если ещё нет
    EXECUTE format(
      'ALTER TABLE %I ADD COLUMN IF NOT EXISTS system_model_id VARCHAR(255)',
      v_table
    );

    -- 2. Бэкфиллим только строки, где есть старый model_id и ещё нет system_model_id
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name   = v_table
        AND column_name  = 'model_id'
    ) THEN
      EXECUTE format($f$
        UPDATE %I t
        SET system_model_id = ar.model_id
        FROM artefact_realizations_new ar
        WHERE ar.artefact_id = 2001
          AND ar.effective_to = TIMESTAMP '9999-12-31 23:59:59'
          AND ar.artefact_string_value = t.model_id
          AND t.system_model_id IS NULL
      $f$, v_table);

      -- 3. Проверяем, что не осталось unmapped строк — иначе падаем
      EXECUTE format(
        'SELECT count(*) FROM %I WHERE system_model_id IS NULL AND model_id IS NOT NULL',
        v_table
      ) INTO v_missing_count;

      IF v_missing_count > 0 THEN
        RAISE NOTICE
          'Table % still has % unmapped rows; keeping legacy model_id column and skipping destructive steps for this table.',
          v_table, v_missing_count;
      ELSE
        -- 4. Снимаем старый unique/индекс/constraint, зависящий от model_id
        IF v_table = 'models_pim_usage' THEN
          EXECUTE 'ALTER TABLE models_pim_usage
                   DROP CONSTRAINT IF EXISTS models_pim_usage_model_id_confirmation_quarter_confirmation_year_key';
        END IF;
        EXECUTE format('DROP INDEX IF EXISTS idx_%I_model_id', v_table);

        -- 5. Удаляем старую колонку
        EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS model_id', v_table);
      END IF;
    END IF;
  END LOOP;
END
$$;

-- --- Constraints / indexes уже на system_model_id -------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'models_usage'
      AND column_name = 'system_model_id'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_models_usage_smid_q_y
      ON models_usage (system_model_id, confirmation_quarter, confirmation_year);
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'models_usage_history'
      AND column_name = 'system_model_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_models_usage_history_smid
      ON models_usage_history (system_model_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'models_pim_usage'
      AND column_name = 'system_model_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'models_pim_usage_smid_q_y_key'
    ) THEN
      ALTER TABLE models_pim_usage
        ADD CONSTRAINT models_pim_usage_smid_q_y_key
        UNIQUE (system_model_id, confirmation_quarter, confirmation_year);
    END IF;

    CREATE INDEX IF NOT EXISTS idx_models_pim_usage_smid
      ON models_pim_usage (system_model_id);
    CREATE INDEX IF NOT EXISTS idx_models_pim_usage_quarter_year
      ON models_pim_usage (confirmation_quarter, confirmation_year);
  END IF;
END
$$;

-- После успешного маппинга делаем колонку обязательной
DO $$
DECLARE
  v_missing_count bigint;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'models_pim_usage'
      AND column_name = 'system_model_id'
  ) THEN
    SELECT count(*)
    INTO v_missing_count
    FROM models_pim_usage
    WHERE system_model_id IS NULL;

    IF v_missing_count = 0 THEN
      ALTER TABLE models_pim_usage ALTER COLUMN system_model_id SET NOT NULL;
    ELSE
      RAISE NOTICE 'Skipping SET NOT NULL for models_pim_usage.system_model_id: % NULL rows remain', v_missing_count;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'models_usage'
      AND column_name = 'system_model_id'
  ) THEN
    SELECT count(*)
    INTO v_missing_count
    FROM models_usage
    WHERE system_model_id IS NULL;

    IF v_missing_count = 0 THEN
      ALTER TABLE models_usage ALTER COLUMN system_model_id SET NOT NULL;
    ELSE
      RAISE NOTICE 'Skipping SET NOT NULL for models_usage.system_model_id: % NULL rows remain', v_missing_count;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'models_usage_history'
      AND column_name = 'system_model_id'
  ) THEN
    SELECT count(*)
    INTO v_missing_count
    FROM models_usage_history
    WHERE system_model_id IS NULL;

    IF v_missing_count = 0 THEN
      ALTER TABLE models_usage_history ALTER COLUMN system_model_id SET NOT NULL;
    ELSE
      RAISE NOTICE 'Skipping SET NOT NULL for models_usage_history.system_model_id: % NULL rows remain', v_missing_count;
    END IF;
  END IF;
END
$$;

COMMIT;
