import { Injectable, Logger } from '@nestjs/common'
import { createHash } from 'crypto'
import { UsersTasksService } from '../tasks/services/users-tasks.service'
import { ModelsService } from '../models/models.service'
import { MrmDatabaseService } from '../../system/mrm-database/database.service'
import { Task, Model } from '../tasks/interfaces'

@Injectable()
export class TasksDatamartService {
  private readonly logger = new Logger(TasksDatamartService.name)

  constructor(
    private readonly usersTasksService: UsersTasksService,
    private readonly modelsService: ModelsService,
    private readonly mrmDatabaseService: MrmDatabaseService
  ) {}

  /**
   * Синхронизация всех задач в BI витрину
   * Запускается раз в сутки
   */
  async syncAllTasksToDatamart(): Promise<{
    success: boolean
    totalProcessed: number
    inserted: number
    deleted: number
    errors: string[]
    duration_ms: number
  }> {
    const startTime = Date.now()
    this.logger.log('🚀 Начало синхронизации Tasks BI витрины')

    const result = {
      success: false,
      totalProcessed: 0,
      inserted: 0,
      deleted: 0,
      errors: [],
      duration_ms: 0
    }

    try {
      // Получаем все модели для передачи в getUsersActiveTasks
      this.logger.log('📊 Получение моделей...')
      const models = await this.modelsService.getModels({ ignoreModeFilter: true })
      
      // Получаем все активные задачи
      this.logger.log('📋 Получение активных задач...')
      const tasks = await this.usersTasksService.getUsersActiveTasks(models as any)
      
      result.totalProcessed = tasks.length
      this.logger.log(`📦 Получено ${tasks.length} задач для синхронизации`)

      if (tasks.length === 0) {
        this.logger.warn('⚠️ Не найдено задач для синхронизации')
        // Удаляем все записи из витрины, так как активных задач нет
        await this.cleanupDatamart()
        result.success = true
        result.duration_ms = Date.now() - startTime
        return result
      }

      // Получаем текущие задачи из витрины для сравнения
      const existingTasks = await this.getExistingTasksMap()
      
      // Очищаем витрину ДО вставки новых задач
      // Поскольку теперь все задачи вставляются как новые записи,
      // мы не можем просто удалить по task_id + model_id
      // Вместо этого очищаем всю витрину и заполняем заново
      if (tasks.length > 0) {
        // Получаем количество существующих записей для статистики
        const existingCount = existingTasks.size
        if (existingCount > 0) {
          this.logger.log(`🧹 Очищаем витрину (${existingCount} существующих записей) для полной синхронизации`)
          await this.cleanupDatamart()
          result.deleted = existingCount
          
          // Теперь все задачи будут вставлены как новые
          this.logger.log(`📝 Все ${tasks.length} задач будут вставлены как новые записи`)
        }
      }
      
      const processedTaskKeys = new Set<string>()

      // Обрабатываем задачи батчами
      const batchSize = 100
      for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize)
        
        this.logger.log(`🔄 Обрабатываем батч ${Math.floor(i/batchSize) + 1} из ${Math.ceil(tasks.length/batchSize)}`)
        
        for (let j = 0; j < batch.length; j++) {
          const task = batch[j]
          // Создаем уникальный ключ для каждой задачи, включая дубли
          // Используем индекс в батче + timestamp для уникальности
          const uniqueKey = `${task.task_id}_${task.model_id}_${i + j}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          processedTaskKeys.add(uniqueKey)
          
          try {
            // Теперь все задачи только вставляются
            await this.upsertTask(task)
            result.inserted++
            
          } catch (error) {
            this.logger.error(`❌ Ошибка при обработке задачи ${uniqueKey}: ${error.message}`)
            result.errors.push(`Задача ${uniqueKey}: ${error.message}`)
          }
        }
      }

      result.success = true
      result.duration_ms = Date.now() - startTime
      
      this.logger.log(`✅ Синхронизация задач завершена за ${result.duration_ms}мс`)
      this.logger.log(`📊 Вставлено: ${result.inserted}, Удалено: ${result.deleted}`)

    } catch (error) {
      result.duration_ms = Date.now() - startTime
      this.logger.error(`💥 Критическая ошибка синхронизации задач: ${error.message}`, error.stack)
      result.errors.push(`Критическая ошибка: ${error.message}`)
    }

    return result
  }

  /**
   * Получение статистики Tasks витрины
   */
  async getTasksDatamartStats() {
    const [totalResult, lastUpdateResult] = await Promise.all([
      this.mrmDatabaseService.query('SELECT COUNT(*) as count FROM tasks_bi_datamart', {}),
      this.mrmDatabaseService.query('SELECT MAX(updated_at) as last_update FROM tasks_bi_datamart', {})
    ])

    return {
      total_records: parseInt(totalResult[0].count),
      last_update: lastUpdateResult[0].last_update ? new Date(lastUpdateResult[0].last_update) : null
    }
  }

  /**
   * Получение задач из витрины
   */
  async getTasksFromDatamart(): Promise<Task[]> {
    const rows = await this.mrmDatabaseService.query(`
      SELECT 
        task_id,
        model_id,
        assignee,
        role,
        ds_stream,
        update_date,
        task_data
      FROM tasks_bi_datamart 
      ORDER BY model_id, task_id
    `, {})
    
    return rows.map(row => {
      const taskData = typeof row.task_data === 'string' 
        ? JSON.parse(row.task_data) 
        : row.task_data
      
      // Базовые поля из колонок (для производительности)
      // Остальные поля из JSON
      return {
        ...taskData,
        // Переопределяем ключевые поля из колонок, так как они могут быть более актуальными
        task_id: row.task_id,
        model_id: row.model_id,
        assignee: row.assignee,
        role: row.role,
        ds_stream: row.ds_stream,
        update_date: row.update_date
      }
    })
  }

  /**
   * Вставка задачи в витрину
   * Теперь всегда вставляет новые записи для дублей
   */
  private async upsertTask(task: Task): Promise<void> {
    // Для дублей всегда вставляем как новую запись
    // Убираем проверку на существование по task_id + model_id
    
    const dataHash = this.createTaskHash(task)
    
    // Всегда вставляем новую задачу
    await this.mrmDatabaseService.query(`
      INSERT INTO tasks_bi_datamart (
        task_id, model_id, assignee, role, ds_stream, update_date,
        task_data, data_hash, created_at, updated_at
      ) VALUES (
        :task_id, :model_id, :assignee, :role, :ds_stream, :update_date,
        :task_data::jsonb, :data_hash, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `, this.prepareTaskData(task, dataHash))
  }

  /**
   * Удаление задачи из витрины
   */
  private async deleteTask(task_id: string, model_id: string): Promise<void> {
    await this.mrmDatabaseService.query(
      'DELETE FROM tasks_bi_datamart WHERE task_id = :task_id AND model_id = :model_id',
      { task_id, model_id }
    )
  }

  /**
   * Очистка всей витрины (когда нет активных задач)
   */
  private async cleanupDatamart(): Promise<void> {
    await this.mrmDatabaseService.query('TRUNCATE TABLE tasks_bi_datamart', {})
    this.logger.log('🧹 Витрина задач очищена')
  }

  /**
   * Получение карты существующих задач
   * Теперь просто считаем количество записей для статистики
   */
  private async getExistingTasksMap(): Promise<Map<string, string>> {
    const rows = await this.mrmDatabaseService.query(
      'SELECT id FROM tasks_bi_datamart',
      {}
    )
    
    // Создаем пустую карту, так как мы не используем её для логики
    // Просто возвращаем размер для статистики
    const map = new Map<string, string>()
    
    // Добавляем фиктивные ключи для подсчета
    rows.forEach((row, index) => {
      map.set(`record_${index}`, 'dummy')
    })
    
    return map
  }

  /**
   * Подготовка данных задачи для вставки/обновления
   */
  private prepareTaskData(task: Task, dataHash: string) {
    return {
      task_id: task.task_id,
      model_id: task.model_id,
      assignee: task.assignee,
      role: task.role,
      ds_stream: task.ds_stream,
      update_date: task.update_date,
      task_data: JSON.stringify(task),
      data_hash: dataHash
    }
  }

  /**
   * Создание MD5 хеша от данных задачи
   */
  private createTaskHash(task: Task): string {
    // Создаём объект только с важными полями для хеша
    const hashableTask = {
      task_id: task.task_id,
      model_id: task.model_id,
      name: task.name,
      assignee: task.assignee,
      role: task.role,
      bpmn_key: task.bpmn_key,
      ds_stream: task.ds_stream,
      update_date: task.update_date
    }

    const taskString = JSON.stringify(hashableTask)
    return createHash('md5').update(taskString).digest('hex')
  }
} 