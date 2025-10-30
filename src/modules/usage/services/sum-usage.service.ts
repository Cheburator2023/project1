import { Injectable } from '@nestjs/common'
import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { BaseUsageService } from './base-usage.service'
import { IUsageService } from '../interfaces'
import { UpdateUsageDto } from '../dto'
import { SUMUsageEntity, SUMUsageHistEntity } from '../entities'
import { SumModelService } from 'src/modules/models/services'
import { LoggerService } from 'src/system/logger/logger.service'

type GetUsageParams = Pick<
  UpdateUsageDto,
  'model_id' | 'confirmation_year' | 'confirmation_quarter'
>
type UpdateUsageParams = Pick<
  UpdateUsageDto,
  | 'model_id'
  | 'confirmation_date'
  | 'is_used'
  | 'confirmation_year'
  | 'confirmation_quarter'
>
type InsertUsageParams = Pick<
  UpdateUsageDto,
  | 'model_id'
  | 'confirmation_date'
  | 'is_used'
  | 'confirmation_year'
  | 'confirmation_quarter'
>
type InsertUsageHistoryParams = Pick<
  UpdateUsageDto,
  | 'model_id'
  | 'confirmation_quarter'
  | 'confirmation_year'
  | 'is_used'
  | 'creator'
>

@Injectable()
export class SumUsageService extends BaseUsageService implements IUsageService {
  constructor(
    databaseService: SumDatabaseService,
    modelService: SumModelService,
    logger: LoggerService
  ) {
    super(databaseService, modelService, logger)
  }

  async handleUpdateUsage(data: UpdateUsageDto): Promise<boolean> {
    this.logger.info(
      'Handling update usage',
      'ОбработкаОбновленияИспользования',
      {
        model_id: data.model_id,
        confirmation_year: data.confirmation_year,
        confirmation_quarter: data.confirmation_quarter,
        is_used: data.is_used
      }
    )

    const {
      model_id,
      confirmation_date,
      is_used,
      confirmation_year,
      confirmation_quarter,
      creator
    } = data

    try {
      const model = await this.modelService.getModelById(model_id)
      if (!model) {
        this.logger.warn(
          'Model not found for usage update',
          'МодельНеНайденаДляОбновленияИспользования',
          {
            model_id
          }
        )
        return false
      }

      // проверить существование записи
      const usage: SUMUsageEntity | null = await this.getUsage({
        model_id,
        confirmation_year,
        confirmation_quarter
      })
      const confirmationDate =
        confirmation_date !== null
          ? confirmation_date
          : usage
          ? usage.confirmation_date
          : new Date().toISOString().split('T')[0]
      const isUsed =
        is_used !== null ? is_used : usage ? usage.confirmed : false

      if (!usage) {
        this.logger.info(
          'Inserting new usage record',
          'ДобавлениеНовойЗаписиИспользования',
          {
            model_id,
            confirmation_year,
            confirmation_quarter
          }
        )

        const usageItem: SUMUsageEntity = await this.insertUsage({
          model_id,
          confirmation_date: confirmationDate,
          confirmation_year,
          confirmation_quarter,
          is_used: isUsed
        })

        if (!usageItem) {
          this.logger.error(
            'Failed to insert usage',
            'ОшибкаДобавленияИспользования',
            null,
            {
              model_id,
              confirmation_year,
              confirmation_quarter
            }
          )
          return false
        }
      } else {
        // проверяем, изменились ли данные
        if (
          this.normalizeToLocalDate(usage.confirmation_date) ===
            this.normalizeToLocalDate(confirmation_date) &&
          usage.confirmed === isUsed
        ) {
          this.logger.info(
            'Usage data unchanged, skipping update',
            'ДанныеИспользованияНеИзмененыПропускОбновления',
            {
              model_id,
              confirmation_year,
              confirmation_quarter
            }
          )
          return false
        }

        this.logger.info(
          'Updating existing usage record',
          'ОбновлениеСуществующейЗаписиИспользования',
          {
            model_id,
            confirmation_year,
            confirmation_quarter
          }
        )

        const usageItem: SUMUsageEntity = await this.updateUsage({
          confirmation_date: confirmationDate,
          is_used: isUsed,
          model_id,
          confirmation_year,
          confirmation_quarter
        })

        if (!usageItem) {
          this.logger.error(
            'Failed to update usage',
            'ОшибкаОбновленияИспользования',
            null,
            {
              model_id,
              confirmation_year,
              confirmation_quarter
            }
          )
          return false
        }
      }

      // добавляем запись в историю
      const usageHistItem: SUMUsageHistEntity = await this.insertUsageHistory({
        model_id,
        confirmation_quarter,
        confirmation_year,
        is_used: isUsed,
        creator
      })

      if (!usageHistItem) {
        this.logger.error(
          'Failed to insert usage history',
          'ОшибкаДобавленияИсторииИспользования',
          null,
          {
            model_id,
            confirmation_year,
            confirmation_quarter
          }
        )
        return false
      }

      this.logger.info(
        'Usage update completed successfully',
        'ОбновлениеИспользованияУспешноЗавершено',
        {
          model_id,
          confirmation_year,
          confirmation_quarter
        }
      )

      return true
    } catch (error) {
      this.logger.error(
        'Error handling usage update',
        'ОшибкаОбработкиОбновленияИспользования',
        error,
        {
          model_id,
          confirmation_year,
          confirmation_quarter
        }
      )
      return false
    }
  }

  async getUsage(params: GetUsageParams): Promise<SUMUsageEntity | null> {
    this.logger.info(
      'Getting usage record',
      'ПолучениеЗаписиИспользования',
      params
    )

    try {
      const [usage] = await this.databaseService.query(
        `
        SELECT *
        FROM model_usage_confirm
        WHERE model_id = :model_id
          AND confirmation_year = :confirmation_year
          AND quarter = :confirmation_quarter;
        `,
        params
      )

      if (usage) {
        this.logger.info('Usage record found', 'ЗаписьИспользованияНайдена', {
          model_id: params.model_id,
          confirmation_year: params.confirmation_year,
          confirmation_quarter: params.confirmation_quarter
        })
      } else {
        this.logger.info(
          'Usage record not found',
          'ЗаписьИспользованияНеНайдена',
          params
        )
      }

      return usage || null
    } catch (error) {
      this.logger.error(
        'Error getting usage record',
        'ОшибкаПолученияЗаписиИспользования',
        error,
        params
      )
      throw error
    }
  }

  async updateUsage(params: UpdateUsageParams): Promise<SUMUsageEntity | null> {
    this.logger.info(
      'Updating usage record',
      'ОбновлениеЗаписиИспользования',
      params
    )

    try {
      const [usage] = await this.databaseService.query(
        `
        UPDATE model_usage_confirm
        SET confirmation_date = :confirmation_date,
            confirmed         = :is_used
        WHERE model_id = :model_id
          AND confirmation_year = :confirmation_year
          AND quarter = :confirmation_quarter
        RETURNING *;
        `,
        params
      )

      if (usage) {
        this.logger.info(
          'Usage record updated successfully',
          'ЗаписьИспользованияУспешноОбновлена',
          {
            model_id: params.model_id,
            confirmation_year: params.confirmation_year,
            confirmation_quarter: params.confirmation_quarter
          }
        )
      } else {
        this.logger.warn(
          'Usage record update returned no rows',
          'ОбновлениеЗаписиИспользованияНеВернулоДанных',
          params
        )
      }

      return usage || null
    } catch (error) {
      this.logger.error(
        'Error updating usage record',
        'ОшибкаОбновленияЗаписиИспользования',
        error,
        params
      )
      throw error
    }
  }

  async insertUsage(params: InsertUsageParams): Promise<SUMUsageEntity | null> {
    this.logger.info(
      'Inserting usage record',
      'ДобавлениеЗаписиИспользования',
      {
        model_id: params.model_id,
        confirmation_year: params.confirmation_year,
        confirmation_quarter: params.confirmation_quarter
      }
    )

    try {
      const [usage] = await this.databaseService.query(
        `
        INSERT INTO model_usage_confirm (model_id, confirmation_date, confirmation_year, quarter, confirmed)
        VALUES (:model_id, :confirmation_date, :confirmation_year, :confirmation_quarter, :is_used)
        RETURNING *;
        `,
        params
      )

      if (usage) {
        this.logger.info(
          'Usage record inserted successfully',
          'ЗаписьИспользованияУспешноДобавлена',
          {
            model_id: params.model_id,
            confirmation_year: params.confirmation_year,
            confirmation_quarter: params.confirmation_quarter
          }
        )
      } else {
        this.logger.warn(
          'Usage record insert returned no rows',
          'ДобавлениеЗаписиИспользованияНеВернулоДанных',
          params
        )
      }

      return usage || null
    } catch (error) {
      this.logger.error(
        'Error inserting usage record',
        'ОшибкаДобавленияЗаписиИспользования',
        error,
        {
          model_id: params.model_id,
          confirmation_year: params.confirmation_year,
          confirmation_quarter: params.confirmation_quarter
        }
      )
      throw error
    }
  }

  async insertUsageHistory(
    params: InsertUsageHistoryParams
  ): Promise<SUMUsageHistEntity | null> {
    this.logger.info(
      'Inserting usage history record',
      'ДобавлениеЗаписиИсторииИспользования',
      {
        model_id: params.model_id,
        confirmation_year: params.confirmation_year,
        confirmation_quarter: params.confirmation_quarter
      }
    )

    try {
      const [usageHist] = await this.databaseService.query(
        `
        INSERT INTO model_usage_confirm_history (model_id, quarter, creator_full_name, effective_year, confirmed)
        VALUES (:model_id, :confirmation_quarter, :creator, :confirmation_year, :is_used)
        RETURNING *;
        `,
        params
      )

      if (usageHist) {
        this.logger.info(
          'Usage history record inserted successfully',
          'ЗаписьИсторииИспользованияУспешноДобавлена',
          {
            model_id: params.model_id,
            confirmation_year: params.confirmation_year,
            confirmation_quarter: params.confirmation_quarter
          }
        )
      } else {
        this.logger.warn(
          'Usage history record insert returned no rows',
          'ДобавлениеЗаписиИсторииИспользованияНеВернулоДанных',
          params
        )
      }

      return usageHist || null
    } catch (error) {
      this.logger.error(
        'Error inserting usage history record',
        'ОшибкаДобавленияЗаписиИсторииИспользования',
        error,
        {
          model_id: params.model_id,
          confirmation_year: params.confirmation_year,
          confirmation_quarter: params.confirmation_quarter
        }
      )
      throw error
    }
  }
}
