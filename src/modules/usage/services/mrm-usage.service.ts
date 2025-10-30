import { Injectable } from '@nestjs/common'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { BaseUsageService } from './base-usage.service'
import { IUsageService } from '../interfaces'
import { UpdateUsageDto } from '../dto'
import { MRMUsageEntity, MRMUsageHistEntity } from '../entities'
import { MrmModelService } from 'src/modules/models/services'
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
  | 'creator'
>
type InsertUsageHistoryParams = Pick<MRMUsageEntity, 'usage_id'> &
  Pick<UpdateUsageDto, 'model_id' | 'confirmation_date' | 'is_used' | 'creator'>

@Injectable()
export class MrmUsageService extends BaseUsageService implements IUsageService {
  constructor(
    databaseService: MrmDatabaseService,
    modelService: MrmModelService,
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
      const usage: MRMUsageEntity | null = await this.getUsage({
        model_id,
        confirmation_year,
        confirmation_quarter
      })
      let usageId = null
      const confirmationDate =
        confirmation_date !== null
          ? confirmation_date
          : usage
          ? usage.confirmation_date
          : new Date().toISOString().split('T')[0]
      const isUsed = is_used !== null ? is_used : usage ? usage.is_used : false

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

        const usageItem: MRMUsageEntity = await this.insertUsage({
          model_id,
          confirmation_date: confirmationDate,
          confirmation_year,
          confirmation_quarter,
          is_used: isUsed,
          creator
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

        usageId = usageItem.usage_id
      } else {
        // проверяем, изменились ли данные
        if (
          this.normalizeToLocalDate(usage.confirmation_date) ===
            this.normalizeToLocalDate(confirmation_date) &&
          usage.is_used === isUsed
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

        const usageItem: MRMUsageEntity = await this.updateUsage({
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

        usageId = usageItem.usage_id
      }

      // добавляем запись в историю
      const usageHistItem: MRMUsageHistEntity = await this.insertUsageHistory({
        usage_id: usageId,
        model_id,
        confirmation_date: confirmationDate,
        is_used: isUsed,
        creator
      })

      if (!usageHistItem) {
        this.logger.error(
          'Failed to insert usage history',
          'ОшибкаДобавленияИсторииИспользования',
          null,
          {
            usageId
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
          confirmation_quarter,
          usageId
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

  async getUsage(params: GetUsageParams): Promise<MRMUsageEntity | null> {
    this.logger.info(
      'Getting usage record',
      'ПолучениеЗаписиИспользования',
      params
    )

    try {
      const [usage] = await this.databaseService.query(
        `
        SELECT *
        FROM models_usage
        WHERE model_id = :model_id
          AND confirmation_year = :confirmation_year
          AND confirmation_quarter = :confirmation_quarter;
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

  async updateUsage(params: UpdateUsageParams): Promise<MRMUsageEntity | null> {
    this.logger.info(
      'Updating usage record',
      'ОбновлениеЗаписиИспользования',
      params
    )

    try {
      const [usage] = await this.databaseService.query(
        `
        UPDATE models_usage
        SET confirmation_date = :confirmation_date,
            is_used           = :is_used
        WHERE model_id = :model_id
          AND confirmation_year = :confirmation_year
          AND confirmation_quarter = :confirmation_quarter
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

  async insertUsage(params: InsertUsageParams): Promise<MRMUsageEntity | null> {
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
        INSERT INTO models_usage (model_id, confirmation_date, confirmation_year, confirmation_quarter, is_used, creator)
        VALUES (:model_id, :confirmation_date, :confirmation_year, :confirmation_quarter, coalesce(:is_used, FALSE), :creator)
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
            confirmation_quarter: params.confirmation_quarter,
            usage_id: usage.usage_id
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
  ): Promise<MRMUsageHistEntity | null> {
    this.logger.info(
      'Inserting usage history record',
      'ДобавлениеЗаписиИсторииИспользования',
      {
        usage_id: params.usage_id,
        model_id: params.model_id
      }
    )

    try {
      const [usageHist] = await this.databaseService.query(
        `
        INSERT INTO models_usage_history (usage_id, model_id, confirmation_date, is_used, changed_by)
        VALUES (:usage_id, :model_id, :confirmation_date, :is_used, :creator)
        RETURNING *;
        `,
        params
      )

      if (usageHist) {
        this.logger.info(
          'Usage history record inserted successfully',
          'ЗаписьИсторииИспользованияУспешноДобавлена',
          {
            usage_id: params.usage_id
          }
        )
      } else {
        this.logger.warn(
          'Usage history record insert returned no rows',
          'ДобавлениеЗаписиИсторииИспользованияНеВернулоДанных',
          {
            usage_id: params.usage_id
          }
        )
      }

      return usageHist || null
    } catch (error) {
      this.logger.error(
        'Error inserting usage history record',
        'ОшибкаДобавленияЗаписиИсторииИспользования',
        error,
        {
          usage_id: params.usage_id
        }
      )
      throw error
    }
  }
}
