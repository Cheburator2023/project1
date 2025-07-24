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
    updated: number
    deleted: number
    skipped: number
    errors: string[]
    duration_ms: number
  }> {
    const startTime = Date.now()
    this.logger.log('🚀 Начало синхронизации Tasks BI витрины')

    const result = {
      success: false,
      totalProcessed: 0,
      inserted: 0,
      updated: 0,
      deleted: 0,
      skipped: 0,
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
      const processedTaskKeys = new Set<string>()

      // Обрабатываем задачи батчами
      const batchSize = 100
      for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize)
        
        this.logger.log(`🔄 Обрабатываем батч ${Math.floor(i/batchSize) + 1} из ${Math.ceil(tasks.length/batchSize)}`)
        
        for (const task of batch) {
          const taskKey = `${task.task_id}_${task.model_id}`
          processedTaskKeys.add(taskKey)
          
          try {
            const operation = await this.upsertTask(task)
            
            switch (operation) {
              case 'insert':
                result.inserted++
                break
              case 'update':
                result.updated++
                break
              case 'skip':
                result.skipped++
                break
            }
          } catch (error) {
            this.logger.error(`❌ Ошибка при обработке задачи ${taskKey}: ${error.message}`)
            result.errors.push(`Задача ${taskKey}: ${error.message}`)
          }
        }
      }

      // Удаляем задачи, которых больше нет в активных
      const tasksToDelete = Array.from(existingTasks.keys())
        .filter(key => !processedTaskKeys.has(key))
      
      if (tasksToDelete.length > 0) {
        this.logger.log(`🗑️ Удаление ${tasksToDelete.length} неактуальных задач`)
        for (const taskKey of tasksToDelete) {
          const [task_id, model_id] = taskKey.split('_')
          await this.deleteTask(task_id, model_id)
          result.deleted++
        }
      }

      result.success = true
      result.duration_ms = Date.now() - startTime
      
      this.logger.log(`✅ Синхронизация задач завершена за ${result.duration_ms}мс`)
      this.logger.log(`📊 Вставлено: ${result.inserted}, Обновлено: ${result.updated}, Удалено: ${result.deleted}, Пропущено: ${result.skipped}`)

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
   * Вставка или обновление задачи в витрине
   */
  private async upsertTask(task: Task): Promise<'insert' | 'update' | 'skip'> {
    const dataHash = this.createTaskHash(task)

    // Проверяем, есть ли задача и изменились ли данные
    const existingRecord = await this.mrmDatabaseService.query(
      'SELECT data_hash FROM tasks_bi_datamart WHERE task_id = :task_id AND model_id = :model_id',
      { task_id: task.task_id, model_id: task.model_id }
    )

    if (existingRecord.length > 0) {
      // Задача существует, проверяем изменения
      if (existingRecord[0].data_hash === dataHash) {
        return 'skip' // Данные не изменились
      }

      // Обновляем существующую задачу
      await this.mrmDatabaseService.query(`
        UPDATE tasks_bi_datamart 
        SET 
          assignee = :assignee,
          role = :role,
          ds_stream = :ds_stream,
          update_date = :update_date,
          task_data = :task_data::jsonb,
          data_hash = :data_hash,
          updated_at = CURRENT_TIMESTAMP
        WHERE task_id = :task_id AND model_id = :model_id
      `, this.prepareTaskData(task, dataHash))

      return 'update'
    } else {
      // Вставляем новую задачу
      await this.mrmDatabaseService.query(`
        INSERT INTO tasks_bi_datamart (
          task_id, model_id, assignee, role, ds_stream, update_date,
          task_data, data_hash, created_at, updated_at
        ) VALUES (
          :task_id, :model_id, :assignee, :role, :ds_stream, :update_date,
          :task_data::jsonb, :data_hash, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `, this.prepareTaskData(task, dataHash))

      return 'insert'
    }
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
   */
  private async getExistingTasksMap(): Promise<Map<string, string>> {
    const rows = await this.mrmDatabaseService.query(
      'SELECT task_id, model_id, data_hash FROM tasks_bi_datamart',
      {}
    )
    
    const map = new Map<string, string>()
    rows.forEach(row => {
      const key = `${row.task_id}_${row.model_id}`
      map.set(key, row.data_hash)
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