import { Injectable, Logger } from '@nestjs/common'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { BaseUsageService } from './base-usage.service'
import { IUsageService } from '../interfaces'
import { UpdateUsageDto } from '../dto'
import { MRMUsageEntity, MRMUsageHistEntity } from '../entities'
import { MrmModelService } from 'src/modules/models/services'

type GetUsageParams = Pick<UpdateUsageDto, 'model_id' | 'confirmation_year' | 'confirmation_quarter'>
type UpdateUsageParams = Pick<UpdateUsageDto, 'model_id' | 'confirmation_date' | 'is_used' | 'confirmation_year' | 'confirmation_quarter'>
type InsertUsageParams = Pick<UpdateUsageDto, 'model_id' | 'confirmation_date' | 'is_used' | 'confirmation_year' | 'confirmation_quarter' | 'creator'>
type InsertUsageHistoryParams =
  Pick<MRMUsageEntity, 'usage_id'> &
  Pick<UpdateUsageDto, 'model_id' | 'confirmation_date' | 'is_used' | 'creator'>

@Injectable()
export class MrmUsageService extends BaseUsageService implements IUsageService {
  protected logger = new Logger(MrmUsageService.name)

  constructor(
    databaseService: MrmDatabaseService,
    modelService: MrmModelService
  ) {
    super(databaseService, modelService)
  }

  async handleUpdateUsage(data: UpdateUsageDto): Promise<boolean> {
    const { model_id, confirmation_date, is_used, confirmation_year, confirmation_quarter, creator } = data

    // проверить существование модели
    const model = await this.modelService.getModelById(model_id)
    if (!model) {
      return false
    }

    // проверить существование записи
    const usage: MRMUsageEntity | null = await this.getUsage({
      model_id,
      confirmation_year,
      confirmation_quarter
    })
    let usageId = null
    let confirmationDate = confirmation_date !== null ? confirmation_date : usage ? usage.confirmation_date : (new Date()).toISOString().split('T')[0]
    let isUsed = is_used !== null ? is_used : usage ? usage.is_used : false

    if (!usage) {
      // если нет записи, то добавляем
      const usageItem: MRMUsageEntity = await this.insertUsage({
        model_id,
        confirmation_date: confirmationDate,
        confirmation_year,
        confirmation_quarter,
        is_used: isUsed,
        creator
      })

      if (!usageItem) {
        return false
      }

      usageId = usageItem.usage_id
    } else {
      // проверяем, изменились ли данные
      if (this.normalizeToLocalDate(usage.confirmation_date) === this.normalizeToLocalDate(confirmation_date) && usage.is_used === isUsed) {
        return false
      }

      // если есть запись, то обновляем
      const usageItem: MRMUsageEntity = await this.updateUsage({
        confirmation_date: confirmationDate,
        is_used: isUsed,
        model_id,
        confirmation_year,
        confirmation_quarter
      })

      if (!usageItem) {
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
      return false
    }

    return true
  }

  async getUsage(params: GetUsageParams): Promise<MRMUsageEntity | null> {
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

    return usage || null
  }

  async updateUsage(params: UpdateUsageParams): Promise<MRMUsageEntity | null> {
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

    return usage || null
  }

  async insertUsage(params: InsertUsageParams): Promise<MRMUsageEntity | null> {
    const [usage] = await this.databaseService.query(
      `
      INSERT INTO models_usage (model_id, confirmation_date, confirmation_year, confirmation_quarter, is_used, creator)
      VALUES (:model_id, :confirmation_date, :confirmation_year, :confirmation_quarter, coalesce(:is_used, FALSE), :creator)
      RETURNING *;
      `,
      params
    )

    return usage || null
  }

  async insertUsageHistory(params: InsertUsageHistoryParams): Promise<MRMUsageHistEntity | null> {
    const [usageHist] = await this.databaseService.query(
      `
      INSERT INTO models_usage_history (usage_id, model_id, confirmation_date, is_used, changed_by)
      VALUES (:usage_id, :model_id, :confirmation_date, :is_used, :creator)
      RETURNING *;
      `,
      params
    )

    return usageHist || null
  }
}
