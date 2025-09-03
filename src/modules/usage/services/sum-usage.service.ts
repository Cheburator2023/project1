import { Injectable, Logger } from '@nestjs/common'
import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { BaseUsageService } from './base-usage.service'
import { IUsageService } from '../interfaces'
import { UpdateUsageDto } from '../dto'
import { SUMUsageEntity, SUMUsageHistEntity } from '../entities'
import { SumModelService } from 'src/modules/models/services'

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
  protected logger = new Logger(SumUsageService.name)

  constructor(
    databaseService: SumDatabaseService,
    modelService: SumModelService
  ) {
    super(databaseService, modelService)
  }

  async handleUpdateUsage(data: UpdateUsageDto): Promise<boolean> {
    const {
      model_id,
      confirmation_date,
      is_used,
      confirmation_year,
      confirmation_quarter,
      creator
    } = data

    // проверить существование модели
    const model = await this.modelService.getModelById(model_id)
    if (!model) {
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
    const isUsed = is_used !== null ? is_used : usage ? usage.confirmed : false

    if (!usage) {
      // если нет записи, то добавляем
      const usageItem: SUMUsageEntity = await this.insertUsage({
        model_id,
        confirmation_date: confirmationDate,
        confirmation_year,
        confirmation_quarter,
        is_used: isUsed
      })

      if (!usageItem) {
        return false
      }
    } else {
      // проверяем, изменились ли данные
      if (
        this.normalizeToLocalDate(usage.confirmation_date) ===
          this.normalizeToLocalDate(confirmation_date) &&
        usage.confirmed === isUsed
      ) {
        return false
      }

      // если есть запись, то обновляем
      const usageItem: SUMUsageEntity = await this.updateUsage({
        confirmation_date: confirmationDate,
        is_used: isUsed,
        model_id,
        confirmation_year,
        confirmation_quarter
      })

      if (!usageItem) {
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
      return false
    }

    return true
  }

  async getUsage(params: GetUsageParams): Promise<SUMUsageEntity | null> {
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

    return usage || null
  }

  async updateUsage(params: UpdateUsageParams): Promise<SUMUsageEntity | null> {
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

    return usage || null
  }

  async insertUsage(params: InsertUsageParams): Promise<SUMUsageEntity | null> {
    const [usage] = await this.databaseService.query(
      `
      INSERT INTO model_usage_confirm (model_id, confirmation_date, confirmation_year, quarter, confirmed)
      VALUES (:model_id, :confirmation_date, :confirmation_year, :confirmation_quarter, :is_used)
      RETURNING *;
      `,
      params
    )

    return usage || null
  }

  async insertUsageHistory(
    params: InsertUsageHistoryParams
  ): Promise<SUMUsageHistEntity | null> {
    const [usageHist] = await this.databaseService.query(
      `
      INSERT INTO model_usage_confirm_history (model_id, quarter, creator_full_name, effective_year, confirmed)
      VALUES (:model_id, :confirmation_quarter, :creator, :confirmation_year, :is_used)
      RETURNING *;
      `,
      params
    )

    return usageHist || null
  }
}
