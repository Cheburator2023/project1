-- -----------------------------------------------------------------------------
-- Seed: использование модели из ПИМ (models_pim_usage) для двух версий с препрода.
-- Алиасы: model18793-v1, model19693-v1 (= 'model' || root_model_id || '-v' || version).
--
-- Колонка system_model_id = models_new.model_id (UUID текстом), не алиас.
-- Логику чтения см. PimUsageService + QuarterlyConfirmationService (приоритет ПИМ
-- над переносом из предыдущего квартала для активного квартала/year из API).
--
-- Применение: выполнить в той же схеме, где лежит models_usage / models_new
-- (как usage_system_model_id_01_create_pim_usage_only.sql).
-- Подстройте confirmation_quarter / confirmation_year под стенд.
-- -----------------------------------------------------------------------------

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
    INSERT INTO %I.models_pim_usage (
      system_model_id,
      confirmation_quarter,
      confirmation_year,
      is_used,
      source_system
    )
    SELECT
      m.model_id::text,
      q.confirmation_quarter,
      q.confirmation_year,
      TRUE,
      'PIM'
    FROM %I.models_new m
    CROSS JOIN (
      VALUES (1, 2026), (2, 2026)
    ) AS q (confirmation_quarter, confirmation_year)
    WHERE ('model' || m.root_model_id::text || '-v' || m.model_version::text)
      IN ('model18793-v1', 'model19693-v1')
    ON CONFLICT (system_model_id, confirmation_quarter, confirmation_year)
    DO UPDATE SET
      is_used = EXCLUDED.is_used,
      source_system = EXCLUDED.source_system,
      update_date = NOW()
  $sql$, v_schema, v_schema);

  RAISE NOTICE 'seed models_pim_usage for model18793-v1 / model19693-v1 in schema %', v_schema;
END $$;
