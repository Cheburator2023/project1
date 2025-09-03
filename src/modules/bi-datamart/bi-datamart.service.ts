import { Injectable, Logger } from '@nestjs/common'
import { createHash } from 'crypto'
import { ModelsService } from '../models/models.service'
import { MrmDatabaseService } from '../../system/mrm-database/database.service'

@Injectable()
export class BiDatamartService {
  private readonly logger = new Logger(BiDatamartService.name)

  constructor(
    private readonly modelsService: ModelsService,
    private readonly mrmDatabaseService: MrmDatabaseService
  ) {}

  /**
   * Синхронизация всех данных из ModelsService в BI витрину
   * Запускается раз в сутки
   */
  async syncAllModelsToDatamart(): Promise<{
    success: boolean
    totalProcessed: number
    inserted: number
    updated: number
    skipped: number
    errors: string[]
    duration_ms: number
    updatedModels?: string[]
    insertedModels?: string[]
  }> {
    const startTime = Date.now()
    this.logger.log('🚀 Начало синхронизации BI витрины')

    const result = {
      success: false,
      totalProcessed: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      duration_ms: 0,
      updatedModels: [],
      insertedModels: []
    }

    try {
      // Получаем ВСЕ модели из ModelsService
      this.logger.log('📊 Получение данных из ModelsService...')

      // Добавляем таймаут и более детальное логирование
      const startGetModels = Date.now()
      this.logger.log(
        '🔍 Вызываем modelsService.getModels({ ignoreModeFilter: true })'
      )

      const models = await this.modelsService.getModels({
        ignoreModeFilter: true
      })

      const getModelsTime = Date.now() - startGetModels
      this.logger.log(`✅ Данные получены за ${getModelsTime}мс`)

      result.totalProcessed = models.length

      this.logger.log(`📦 Получено ${models.length} моделей для синхронизации`)

      if (models.length === 0) {
        this.logger.warn('⚠️ Не найдено моделей для синхронизации')
        result.success = true
        result.duration_ms = Date.now() - startTime
        return result
      }

      // Обрабатываем модели батчами
      const batchSize = 100
      for (let i = 0; i < models.length; i += batchSize) {
        const batch = models.slice(i, i + batchSize)

        this.logger.log(
          `🔄 Обрабатываем батч ${Math.floor(i / batchSize) + 1} из ${Math.ceil(
            models.length / batchSize
          )} (модели ${i + 1}-${Math.min(i + batchSize, models.length)})`
        )

        for (const model of batch) {
          try {
            const operation = await this.upsertModel(model)

            switch (operation) {
              case 'insert':
                result.inserted++
                result.insertedModels.push(model.system_model_id)
                break
              case 'update':
                result.updated++
                result.updatedModels.push(model.system_model_id)
                this.logger.log(`🔄 Обновлена модель: ${model.system_model_id}`)
                break
              case 'skip':
                result.skipped++
                break
            }
          } catch (error) {
            this.logger.error(
              `❌ Ошибка при обработке модели ${model.system_model_id}: ${error.message}`
            )
            result.errors.push(
              `Модель ${model.system_model_id}: ${error.message}`
            )
          }
        }

        // Логгируем прогресс чаще - каждые 100 моделей
        const processed = Math.min(i + batchSize, models.length)
        const percentage = Math.round((processed / models.length) * 100)
        const elapsed = Date.now() - startTime
        const avgTimePerModel = elapsed / processed
        const remainingModels = models.length - processed
        const estimatedTimeRemaining = Math.round(
          (avgTimePerModel * remainingModels) / 1000
        )

        this.logger.log(
          `📈 Прогресс: ${processed}/${models.length} (${percentage}%) | Вставлено: ${result.inserted}, Обновлено: ${result.updated}, Пропущено: ${result.skipped} | Осталось ~${estimatedTimeRemaining}сек`
        )
      }

      result.success = true
      result.duration_ms = Date.now() - startTime

      this.logger.log(`✅ Синхронизация завершена за ${result.duration_ms}мс`)
      this.logger.log(
        `📊 Вставлено: ${result.inserted}, Обновлено: ${result.updated}, Пропущено: ${result.skipped}`
      )

      // Подробные логи об измененных моделях
      if (result.insertedModels.length > 0) {
        this.logger.log(
          `🆕 Новые модели (${
            result.insertedModels.length
          }): ${result.insertedModels.join(', ')}`
        )
      }

      if (result.updatedModels.length > 0) {
        this.logger.log(
          `🔄 Обновленные модели (${
            result.updatedModels.length
          }): ${result.updatedModels.join(', ')}`
        )
      }
    } catch (error) {
      result.duration_ms = Date.now() - startTime
      this.logger.error(
        `💥 Критическая ошибка синхронизации: ${error.message}`,
        error.stack
      )
      result.errors.push(`Критическая ошибка: ${error.message}`)
    }

    return result
  }

  /**
   * Получение базовой статистики BI витрины
   */
  async getDatamartStats() {
    const [totalResult, lastUpdateResult] = await Promise.all([
      this.mrmDatabaseService.query(
        'SELECT COUNT(*) as count FROM models_bi_datamart',
        {}
      ),
      this.mrmDatabaseService.query(
        'SELECT MAX(updated_at) as last_update FROM models_bi_datamart',
        {}
      )
    ])

    return {
      total_records: parseInt(totalResult[0].count),
      last_update: lastUpdateResult[0].last_update
        ? new Date(lastUpdateResult[0].last_update)
        : null
    }
  }

  /**
   * Вставка или обновление одной модели в витрине
   */
  private async upsertModel(model: any): Promise<'insert' | 'update' | 'skip'> {
    const dataHash = this.createModelHash(model)

    // Проверяем, есть ли модель и изменились ли данные
    const existingRecord = await this.mrmDatabaseService.query(
      'SELECT data_hash FROM models_bi_datamart WHERE system_model_id = :system_model_id',
      { system_model_id: model.system_model_id }
    )

    if (existingRecord.length > 0) {
      // Модель существует, проверяем изменения
      if (existingRecord[0].data_hash === dataHash) {
        return 'skip' // Данные не изменились
      }

      // Обновляем существующую модель
      await this.mrmDatabaseService.query(
        `
        UPDATE models_bi_datamart 
        SET 
          model_data = :model_data::jsonb,
          data_hash = :data_hash,
          updated_at = CURRENT_TIMESTAMP
        WHERE system_model_id = :system_model_id
      `,
        this.prepareModelData(model, dataHash)
      )

      return 'update'
    } else {
      // Вставляем новую модель
      await this.mrmDatabaseService.query(
        `
        INSERT INTO models_bi_datamart (
          system_model_id, model_data, data_hash, created_at, updated_at
        ) VALUES (
          :system_model_id, :model_data::jsonb, :data_hash, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `,
        this.prepareModelData(model, dataHash)
      )

      return 'insert'
    }
  }

  /**
   * Подготовка данных модели для вставки/обновления
   */
  private prepareModelData(model: any, dataHash: string) {
    return {
      system_model_id: model.system_model_id,
      model_data: JSON.stringify(model),
      data_hash: dataHash
    }
  }

  /**
   * Создание MD5 хеша от всех данных модели (по всем полям)
   */
  private createModelHash(model: any): string {
    // Сортируем ключи для стабильного хеша
    const sortedModel = Object.keys(model)
      .sort()
      .reduce((result, key) => {
        result[key] = model[key]
        return result
      }, {})

    const modelString = JSON.stringify(sortedModel)
    return createHash('md5').update(modelString).digest('hex')
  }
}
