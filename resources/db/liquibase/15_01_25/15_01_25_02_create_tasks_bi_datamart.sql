-- Создание витрины для агрегированных данных по задачам
CREATE TABLE IF NOT EXISTS tasks_bi_datamart (
    -- Композитный первичный ключ: task_id + model_id однозначно идентифицируют задачу
    task_id VARCHAR(255) NOT NULL,
    model_id VARCHAR(255) NOT NULL,
    
    -- Ключевые поля для фильтрации и индексации
    assignee VARCHAR(255),      -- Часто фильтруем по исполнителю
    role VARCHAR(100),          -- Часто фильтруем по роли
    ds_stream VARCHAR(255),     -- Часто фильтруем по потоку
    update_date TIMESTAMP,      -- Часто сортируем по дате обновления
    
    -- Полные данные задачи в JSON для гибкости
    task_data JSONB NOT NULL,
    
    -- Хеш для проверки изменений
    data_hash VARCHAR(32) NOT NULL,
    
    -- Метаданные витрины
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Композитный первичный ключ
    PRIMARY KEY (task_id, model_id)
);

-- Индексы для быстрого поиска по ключевым полям
CREATE INDEX idx_tasks_bi_datamart_assignee ON tasks_bi_datamart(assignee);
CREATE INDEX idx_tasks_bi_datamart_role ON tasks_bi_datamart(role);
CREATE INDEX idx_tasks_bi_datamart_ds_stream ON tasks_bi_datamart(ds_stream);
CREATE INDEX idx_tasks_bi_datamart_update_date ON tasks_bi_datamart(update_date);
CREATE INDEX idx_tasks_bi_datamart_updated_at ON tasks_bi_datamart(updated_at);

-- Дополнительные JSON индексы для менее частых запросов
CREATE INDEX idx_tasks_bi_datamart_task_name ON tasks_bi_datamart((task_data->>'name'));
CREATE INDEX idx_tasks_bi_datamart_bpmn_key ON tasks_bi_datamart((task_data->>'bpmn_key'));

-- Комментарии
COMMENT ON TABLE tasks_bi_datamart IS 'BI витрина для агрегированных данных по задачам';
COMMENT ON COLUMN tasks_bi_datamart.task_id IS 'ID задачи из Camunda (taskDefinitionKey)';
COMMENT ON COLUMN tasks_bi_datamart.model_id IS 'ID модели, к которой относится задача';
COMMENT ON COLUMN tasks_bi_datamart.assignee IS 'Исполнитель задачи (денормализовано для производительности)';
COMMENT ON COLUMN tasks_bi_datamart.role IS 'Роль исполнителя (денормализовано для производительности)';
COMMENT ON COLUMN tasks_bi_datamart.ds_stream IS 'Поток данных (денормализовано для производительности)';
COMMENT ON COLUMN tasks_bi_datamart.update_date IS 'Дата последнего обновления артефакта';
COMMENT ON COLUMN tasks_bi_datamart.task_data IS 'Полные данные задачи в формате JSON';
COMMENT ON COLUMN tasks_bi_datamart.data_hash IS 'MD5 хеш для определения изменений'; 