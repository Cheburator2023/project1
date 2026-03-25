CREATE TABLE IF NOT EXISTS models_pim_usage (
  pim_usage_id SERIAL PRIMARY KEY,
  model_id VARCHAR(255) NOT NULL,
  confirmation_quarter INTEGER NOT NULL CHECK (confirmation_quarter BETWEEN 1 AND 4),
  confirmation_year INTEGER NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  source_system VARCHAR(100) DEFAULT 'PIM',
  create_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  update_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (model_id, confirmation_quarter, confirmation_year)
);

CREATE INDEX IF NOT EXISTS idx_models_pim_usage_model_id ON models_pim_usage (model_id);
CREATE INDEX IF NOT EXISTS idx_models_pim_usage_quarter_year ON models_pim_usage (confirmation_quarter, confirmation_year);
