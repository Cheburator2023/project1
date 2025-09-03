import { Injectable, Logger } from '@nestjs/common'
import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { BaseAllocationService } from './base-allocation.service'
import { IAllocationService } from '../interfaces'
import { SUM_TABLES } from '../constants'
import { UpdateAllocationDto } from '../dto'

@Injectable()
export class SumAllocationService
  extends BaseAllocationService
  implements IAllocationService
{
  protected modelsTableName = SUM_TABLES.MODELS
  protected logger = new Logger(SumAllocationService.name)

  constructor(databaseService: SumDatabaseService) {
    super(databaseService)
  }

  async handleUpdateAllocation(data: UpdateAllocationDto): Promise<boolean> {
    const { model_id, gbl_id, percent, comment, creator } = data

    // проверить существование модели
    const model = await this.getModelById(model_id)
    if (!model) {
      return false
    }

    // проверить существование записи
    const allocation = await this.getAllocation(model_id, gbl_id)
    let allocationId = null

    if (!allocation) {
      // если есть запись, то обновляем
      const allocationItem = await this.insertAllocation(data)

      if (!allocationItem) {
        return false
      }

      allocationId = allocationItem.usage_id
    } else {
      // если нет записи, то добавляем
      const allocationItem = await this.updateAllocation(data)

      if (!allocationItem) {
        return false
      }

      allocationId = allocationItem.usage_id
    }

    // обновляем результат
    const allocationHistItem = await this.insertAllocationHistory(
      allocationId,
      {
        field:
          percent !== null ? 'percentage' : comment !== null ? 'comment' : null,
        value: percent !== null ? percent : comment !== null ? comment : null,
        creator
      }
    )

    if (!allocationHistItem) {
      return false
    }

    return true
  }

  async getAllocation(
    model_id: UpdateAllocationDto['model_id'],
    gbl_id: UpdateAllocationDto['gbl_id']
  ): Promise<any> {
    const [allocation] = await this.databaseService.query(
      `
      SELECT * FROM model_allocation_usage WHERE model_id = :model_id AND allocation_id = :allocation_id;
      `,
      {
        model_id,
        allocation_id: gbl_id
      }
    )

    return allocation || null
  }

  async updateAllocation(data: UpdateAllocationDto): Promise<any> {
    const { model_id, gbl_id, percent, comment } = data

    const [allocationItem] = await this.databaseService.query(
      `
      UPDATE model_allocation_usage
      SET percentage = COALESCE(:percentage, percentage),
          comment            = COALESCE(:comment, comment)
      WHERE model_id = :model_id
        AND allocation_id = :gbl_id
      RETURNING *;
      `,
      {
        model_id,
        gbl_id,
        percentage: percent,
        comment
      }
    )

    return allocationItem || null
  }

  async insertAllocation(data: UpdateAllocationDto): Promise<any> {
    const { model_id, gbl_id, percent, comment } = data

    const [allocationItem] = await this.databaseService.query(
      `
      INSERT INTO model_allocation_usage (model_id, allocation_id, percentage, comment)
      VALUES (:model_id, :gbl_id, :percentage, :comment)
      RETURNING *;
      `,
      {
        model_id,
        gbl_id,
        percentage: percent,
        comment
      }
    )

    return allocationItem || null
  }

  async insertAllocationHistory(usage_id, data): Promise<any> {
    const { field, value, creator } = data

    const [allocationHistItem] = await this.databaseService.query(
      `
      INSERT INTO model_allocation_usage_history (usage_id, field, value, creator_full_name, effective_from)
      VALUES (:usage_id, :field, :value, :creator, now())
      RETURNING *;
      `,
      {
        usage_id,
        field,
        value,
        creator
      }
    )

    return allocationHistItem || null
  }
}
