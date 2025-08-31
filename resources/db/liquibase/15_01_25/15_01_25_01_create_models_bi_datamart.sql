--liquibase formatted sql

--changeset bi-datamart:15_01_25_01_create_models_bi_datamart
--comment: Создание BI витрины для данных из ModelsService.getModels() с обновлением раз в сутки

CREATE TABLE models_bi_datamart (
    id SERIAL PRIMARY KEY,
    
    -- Уникальный идентификатор модели (для связей и API)
    system_model_id VARCHAR(255) NOT NULL UNIQUE,
    
    -- ВСЕ данные модели из getModels() в JSON (~100 полей)
    model_data JSONB NOT NULL,
    
    -- Служебные поля
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_hash VARCHAR(64)                                 -- MD5 хеш для оптимизации обновлений
);

-- Индексы для оптимизации запросов
CREATE INDEX idx_models_bi_datamart_system_model_id ON models_bi_datamart(system_model_id);
CREATE INDEX idx_models_bi_datamart_updated_at ON models_bi_datamart(updated_at);

-- GIN индекс для быстрого поиска по JSON данным
CREATE INDEX idx_models_bi_datamart_model_data_gin ON models_bi_datamart USING GIN (model_data);

-- Комментарии к таблице
COMMENT ON TABLE models_bi_datamart IS 'BI витрина для данных из ModelsService.getModels(). Обновляется раз в сутки.';
COMMENT ON COLUMN models_bi_datamart.system_model_id IS 'Уникальный идентификатор модели';
COMMENT ON COLUMN models_bi_datamart.model_data IS 'ВСЕ данные модели в JSON (~100 полей из getModels())';
COMMENT ON COLUMN models_bi_datamart.data_hash IS 'MD5 хеш для определения изменений данных';

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_models_bi_datamart_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_models_bi_datamart_updated_at
    BEFORE UPDATE ON models_bi_datamart
    FOR EACH ROW
    EXECUTE FUNCTION update_models_bi_datamart_updated_at(); 