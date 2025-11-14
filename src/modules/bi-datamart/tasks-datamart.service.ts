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

  private async checkTableExists(): Promise<boolean> {
    try {
      const result = await this.mrmDatabaseService.query(
        `
        SELECT EXISTS (
          SELECT FROM pg_tables 
          WHERE tablename = 'tasks_bi_datamart'
        ) as table_exists
      `,
        {}
      )
      return result[0]?.table_exists === true
    } catch (error) {
      this.logger.error(
        `❌ Ошибка проверки существования таблицы: ${error.message}`
      )
      return false
    }
  }

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
      const tableExists = await this.checkTableExists()
      if (!tableExists) {
        this.logger.warn(
          '⚠️ Таблица tasks_bi_datamart не существует. Пропускаем синхронизацию.'
        )
        result.success = true
        result.duration_ms = Date.now() - startTime
        result.errors.push(
          'Таблица tasks_bi_datamart не существует - миграция не применена'
        )
        return result
      }

      this.logger.log('📊 Получение моделей...')
      const models = await this.modelsService.getModels({
        ignoreModeFilter: true
      })

      this.logger.log('📋 Получение активных задач...')
      const tasks = await this.usersTasksService.getUsersActiveTasks(
        models as any
      )

      result.totalProcessed = tasks.length
      this.logger.log(`📦 Получено ${tasks.length} задач для синхронизации`)

      if (tasks.length === 0) {
        this.logger.warn('⚠️ Не найдено задач для синхронизации')
        await this.cleanupDatamart()
        result.success = true
        result.duration_ms = Date.now() - startTime
        return result
      }

      const existingTasks = await this.getExistingTasksMap()

      if (tasks.length > 0) {
        const existingCount = existingTasks.size
        if (existingCount > 0) {
          this.logger.log(
            `🧹 Очищаем витрину (${existingCount} существующих записей) для полной синхронизации`
          )
          await this.cleanupDatamart()
          result.deleted = existingCount

          this.logger.log(
            `📝 Все ${tasks.length} задач будут вставлены как новые записи`
          )
        }
      }

      const processedTaskKeys = new Set<string>()

      const batchSize = 100
      for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize)

        for (let j = 0; j < batch.length; j++) {
          const task = batch[j]
          const uniqueKey = `${task.task_id}_${task.model_id}_${
            i + j
          }_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          processedTaskKeys.add(uniqueKey)

          try {
            await this.upsertTask(task)
            result.inserted++
          } catch (error) {
            this.logger.error(
              `❌ Ошибка при обработке задачи ${uniqueKey}: ${error.message}`
            )
            result.errors.push(`Задача ${uniqueKey}: ${error.message}`)
          }
        }

        const processed = Math.min(i + batchSize, tasks.length)
        const percentage = Math.round((processed / tasks.length) * 100)
        if (percentage % 25 === 0 || processed === tasks.length) {
          this.logger.log(
            `📈 Прогресс Tasks: ${processed}/${tasks.length} (${percentage}%)`
          )
        }
      }

      result.success = true
      result.duration_ms = Date.now() - startTime

      this.logger.log(
        `✅ Синхронизация задач завершена за ${result.duration_ms}мс`
      )
      this.logger.log(
        `📊 Вставлено: ${result.inserted}, Удалено: ${result.deleted}`
      )
    } catch (error) {
      result.duration_ms = Date.now() - startTime
      this.logger.error(
        `💥 Критическая ошибка синхронизации задач: ${error.message}`,
        error.stack
      )
      result.errors.push(`Критическая ошибка: ${error.message}`)
    }

    return result
  }

  async getTasksDatamartStats() {
    const tableExists = await this.checkTableExists()
    if (!tableExists) {
      this.logger.warn('⚠️ Таблица tasks_bi_datamart не существует')
      return {
        total_records: 0,
        last_update: null,
        error: 'Таблица не существует'
      }
    }

    try {
      const [totalResult, lastUpdateResult] = await Promise.all([
        this.mrmDatabaseService.query(
          'SELECT COUNT(*) as count FROM tasks_bi_datamart',
          {}
        ),
        this.mrmDatabaseService.query(
          'SELECT MAX(updated_at) as last_update FROM tasks_bi_datamart',
          {}
        )
      ])

      return {
        total_records: parseInt(totalResult[0].count),
        last_update: lastUpdateResult[0].last_update
          ? new Date(lastUpdateResult[0].last_update)
          : null
      }
    } catch (error) {
      this.logger.error(
        `❌ Ошибка получения статистики Tasks: ${error.message}`
      )
      return {
        total_records: 0,
        last_update: null,
        error: error.message
      }
    }
  }

  async getTasksFromDatamart(): Promise<Task[]> {
    const tableExists = await this.checkTableExists()
    if (!tableExists) {
      this.logger.warn(
        '⚠️ Таблица tasks_bi_datamart не существует. Возвращаем пустой массив.'
      )
      return []
    }

    try {
      const rows = await this.mrmDatabaseService.query(
        `
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
    `,
        {}
      )

      return rows.map((row) => {
        const taskData =
          typeof row.task_data === 'string'
            ? JSON.parse(row.task_data)
            : row.task_data

        return {
          ...taskData,
          task_id: row.task_id,
          model_id: row.model_id,
          assignee: row.assignee,
          role: row.role,
          ds_stream: row.ds_stream,
          update_date: row.update_date
        }
      })
    } catch (error) {
      this.logger.error(
        `❌ Ошибка получения задач из витрины: ${error.message}`
      )
      return []
    }
  }

  private async upsertTask(task: Task): Promise<void> {
    const dataHash = this.createTaskHash(task)

    await this.mrmDatabaseService.query(
      `
      INSERT INTO tasks_bi_datamart (
        task_id, model_id, assignee, role, ds_stream, update_date,
        task_data, data_hash, created_at, updated_at
      ) VALUES (
        :task_id, :model_id, :assignee, :role, :ds_stream, :update_date,
        :task_data::jsonb, :data_hash, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `,
      this.prepareTaskData(task, dataHash)
    )
  }

  private async deleteTask(task_id: string, model_id: string): Promise<void> {
    await this.mrmDatabaseService.query(
      'DELETE FROM tasks_bi_datamart WHERE task_id = :task_id AND model_id = :model_id',
      { task_id, model_id }
    )
  }

  private async cleanupDatamart(): Promise<void> {
    await this.mrmDatabaseService.query('TRUNCATE TABLE tasks_bi_datamart', {})
    this.logger.log('🧹 Витрина задач очищена')
  }

  private async getExistingTasksMap(): Promise<Map<string, string>> {
    const rows = await this.mrmDatabaseService.query(
      'SELECT id FROM tasks_bi_datamart',
      {}
    )

    const map = new Map<string, string>()

    rows.forEach((row, index) => {
      map.set(`record_${index}`, 'dummy')
    })

    return map
  }

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

  private createTaskHash(task: Task): string {
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
