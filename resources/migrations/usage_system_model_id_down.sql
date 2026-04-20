-- =============================================================================
-- Откат миграции usage_system_model_id_up.sql
--
-- Возвращает 3 таблицы к колонке model_id (артефакт 2001):
--   * ADD COLUMN model_id + бэкфилл из artefact_realizations_new
--     (обратный джойн: по models_new.model_id = system_model_id)
--   * восстановление старых constraint/индексов
--   * DROP COLUMN system_model_id
--
-- Failsafe:
--   * Идемпотентен — можно запускать повторно.
--   * Атомарен — одна транзакция; при ошибке всё откатывается.
--   * Перед DROP COLUMN проверяем, что нет строк с system_model_id, которые
--     не смогли обратно замапить в артефакт 2001 — иначе RAISE EXCEPTION.
--
-- Внимание: если таблица models_pim_usage была СОЗДАНА этой миграцией (её не было
-- до неё), правильнее не откатывать, а просто DROP TABLE — закомментированный
-- вариант в конце файла.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_table         text;
  v_missing_count bigint;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['models_usage', 'models_usage_history', 'models_pim_usage']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name = v_table
    ) THEN
      RAISE NOTICE 'Table % not found, skipping', v_table;
      CONTINUE;
    END IF;

    -- 1. Добавляем старую колонку
    EXECUTE format(
      'ALTER TABLE %I ADD COLUMN IF NOT EXISTS model_id VARCHAR(255)',
      v_table
    );

    -- 2. Бэкфилл из artefact_realizations_new: system_model_id -> артефакт 2001
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name   = v_table
        AND column_name  = 'system_model_id'
    ) THEN
      EXECUTE format($f$
        UPDATE %I t
        SET model_id = ar.artefact_string_value
        FROM artefact_realizations_new ar
        WHERE ar.artefact_id  = 2001
          AND ar.effective_to = TIMESTAMP '9999-12-31 23:59:59'
          AND ar.model_id     = t.system_model_id
          AND t.model_id IS NULL
      $f$, v_table);

      EXECUTE format(
        'SELECT count(*) FROM %I WHERE model_id IS NULL AND system_model_id IS NOT NULL',
        v_table
      ) INTO v_missing_count;

      IF v_missing_count > 0 THEN
        RAISE NOTICE
          'Rollback: table % has % rows without reverse mapping to legacy model_id. Keeping system_model_id and skipping destructive rollback steps if needed.',
          v_table, v_missing_count;
      END IF;
    END IF;
  END LOOP;
END
$$;

-- Снимаем новые constraint/индексы только если таблицы/колонки существуют
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'models_pim_usage'
  ) THEN
    ALTER TABLE models_pim_usage DROP CONSTRAINT IF EXISTS models_pim_usage_smid_q_y_key;
  END IF;
END
$$;

DROP INDEX IF EXISTS idx_models_usage_smid_q_y;
DROP INDEX IF EXISTS idx_models_usage_history_smid;
DROP INDEX IF EXISTS idx_models_pim_usage_smid;

-- Снимаем NOT NULL c новой колонки перед её удалением
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'models_usage'
      AND column_name = 'system_model_id'
  ) THEN
    ALTER TABLE models_usage ALTER COLUMN system_model_id DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'models_usage_history'
      AND column_name = 'system_model_id'
  ) THEN
    ALTER TABLE models_usage_history ALTER COLUMN system_model_id DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'models_pim_usage'
      AND column_name = 'system_model_id'
  ) THEN
    ALTER TABLE models_pim_usage ALTER COLUMN system_model_id DROP NOT NULL;
  END IF;
END
$$;

-- Удаляем new-колонку
DO $$
DECLARE
  v_missing_count bigint;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'models_usage'
      AND column_name = 'system_model_id'
  ) THEN
    SELECT count(*) INTO v_missing_count FROM models_usage WHERE model_id IS NULL AND system_model_id IS NOT NULL;
    IF v_missing_count = 0 THEN
      ALTER TABLE models_usage DROP COLUMN IF EXISTS system_model_id;
    ELSE
      RAISE NOTICE 'Skipping DROP COLUMN system_model_id for models_usage: % rows still lack legacy model_id', v_missing_count;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'models_usage_history'
      AND column_name = 'system_model_id'
  ) THEN
    SELECT count(*) INTO v_missing_count FROM models_usage_history WHERE model_id IS NULL AND system_model_id IS NOT NULL;
    IF v_missing_count = 0 THEN
      ALTER TABLE models_usage_history DROP COLUMN IF EXISTS system_model_id;
    ELSE
      RAISE NOTICE 'Skipping DROP COLUMN system_model_id for models_usage_history: % rows still lack legacy model_id', v_missing_count;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'models_pim_usage'
      AND column_name = 'system_model_id'
  ) THEN
    SELECT count(*) INTO v_missing_count FROM models_pim_usage WHERE model_id IS NULL AND system_model_id IS NOT NULL;
    IF v_missing_count = 0 THEN
      ALTER TABLE models_pim_usage DROP COLUMN IF EXISTS system_model_id;
    ELSE
      RAISE NOTICE 'Skipping DROP COLUMN system_model_id for models_pim_usage: % rows still lack legacy model_id', v_missing_count;
    END IF;
  END IF;
END
$$;

-- Восстанавливаем старые ограничения/индексы
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'models_usage'
      AND column_name = 'model_id'
  ) THEN
    ALTER TABLE models_usage ALTER COLUMN model_id SET NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'models_usage_history'
      AND column_name = 'model_id'
  ) THEN
    ALTER TABLE models_usage_history ALTER COLUMN model_id SET NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'models_pim_usage'
      AND column_name = 'model_id'
  ) THEN
    ALTER TABLE models_pim_usage ALTER COLUMN model_id SET NOT NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'models_pim_usage'
      AND column_name = 'model_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'models_pim_usage_model_id_confirmation_quarter_confirmation_year_key'
  ) THEN
    ALTER TABLE models_pim_usage
      ADD CONSTRAINT models_pim_usage_model_id_confirmation_quarter_confirmation_year_key
      UNIQUE (model_id, confirmation_quarter, confirmation_year);
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'models_pim_usage'
      AND column_name = 'model_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_models_pim_usage_model_id ON models_pim_usage (model_id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_name = 'models_pim_usage'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_models_pim_usage_quarter_year
      ON models_pim_usage (confirmation_quarter, confirmation_year);
  END IF;
END
$$;

COMMIT;

-- -----------------------------------------------------------------------------
-- Альтернативный откат, если models_pim_usage была создана up-миграцией и её
-- нужно снести целиком:
--
-- BEGIN;
-- DROP TABLE IF EXISTS models_pim_usage;
-- COMMIT;
-- -----------------------------------------------------------------------------
