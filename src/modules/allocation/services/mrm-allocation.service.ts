import { Injectable, Logger } from '@nestjs/common'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { BaseAllocationService } from './base-allocation.service'
import { IAllocationService } from '../interfaces'
import { UpdateAllocationDto } from '../dto'
import { MRM_TABLES } from '../constants'
import { AllocationEntity } from '../entities'

@Injectable()
export class MrmAllocationService
  extends BaseAllocationService
  implements IAllocationService
{
  protected modelsTableName = MRM_TABLES.MODELS
  protected logger = new Logger(MrmAllocationService.name)

  constructor(databaseService: MrmDatabaseService) {
    super(databaseService)
  }

  async handleUpdateAllocation(data: UpdateAllocationDto): Promise<boolean> {
    const { model_id, gbl_id } = data

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

      allocationId = allocationItem.allocation_id
    } else {
      // если нет записи, то добавляем
      const allocationItem = await this.updateAllocation(data)

      if (!allocationItem) {
        return false
      }

      allocationId = allocationItem.allocation_id
    }

    // добавляем запись в историю
    const allocationHistItem = await this.insertAllocationHistory(
      allocationId,
      data
    )

    if (!allocationHistItem) {
      return false
    }

    return true
  }

  async getAllocation(
    model_id: UpdateAllocationDto['model_id'],
    gbl_id: UpdateAllocationDto['gbl_id']
  ): Promise<AllocationEntity | null> {
    const [allocation] = await this.databaseService.query(
      `
      SELECT * FROM models_allocation WHERE model_id = :model_id AND gbl_id = :gbl_id;
      `,
      {
        model_id,
        gbl_id
      }
    )

    return allocation || null
  }

  async updateAllocation(
    data: UpdateAllocationDto
  ): Promise<AllocationEntity | null> {
    const { model_id, gbl_id, percent, comment, creator } = data

    const [allocationItem] = await this.databaseService.query(
      `
      UPDATE models_allocation
      SET allocation_percent = COALESCE(:allocation_percent, allocation_percent),
          comment            = COALESCE(:comment, comment),
          update_date        = NOW(),
          creator            = :creator
      WHERE model_id = :model_id
        AND gbl_id = :gbl_id
      RETURNING *;
      `,
      {
        model_id,
        gbl_id,
        allocation_percent: percent,
        comment,
        creator
      }
    )

    return allocationItem || null
  }

  async insertAllocation(
    data: UpdateAllocationDto
  ): Promise<AllocationEntity | null> {
    const { model_id, gbl_id, percent, comment, creator } = data

    const [allocationItem] = await this.databaseService.query(
      `
      INSERT INTO models_allocation (model_id, gbl_id, allocation_percent, comment, create_date, update_date, creator)
      VALUES (:model_id, :gbl_id, :allocation_percent, :comment, NOW(), NOW(), :creator)
      RETURNING *;
      `,
      {
        model_id,
        gbl_id,
        allocation_percent: percent,
        comment,
        creator
      }
    )

    return allocationItem || null
  }

  async insertAllocationHistory(
    allocation_id,
    data: UpdateAllocationDto
  ): Promise<AllocationEntity | null> {
    const { model_id, gbl_id, percent, comment, creator } = data

    const [allocationHistItem] = await this.databaseService.query(
      `
      INSERT INTO models_allocation_history (allocation_id, model_id, gbl_id, allocation_percent, comment, change_date, changed_by)
      VALUES (:allocation_id, :model_id, :gbl_id, :allocation_percent, :comment, NOW(), :creator)
      RETURNING *;
      `,
      {
        allocation_id,
        model_id,
        gbl_id,
        allocation_percent: percent,
        comment,
        creator
      }
    )

    return allocationHistItem || null
  }
}
