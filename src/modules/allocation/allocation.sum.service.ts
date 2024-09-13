import { Injectable } from '@nestjs/common'
import { SumDatabaseService } from 'src/system/sum-database/database.service'

@Injectable()
export class AllocationSumService {
  constructor(
    private readonly sumDatabaseService: SumDatabaseService
  ) {
  }

  async update({ model_id, gbl_id: allocation_id, percent: percentage, comment }) {
    const check = 'SELECT * FROM model_allocation_usage WHERE model_id = :model_id AND allocation_id = :allocation_id'
    const update = `
      UPDATE model_allocation_usage
      SET percentage = :percentage,
          comment    = :comment
      WHERE model_id = :model_id
        AND allocation_id = :allocation_id
      RETURNING usage_id
    `
    const insert = `
      INSERT INTO model_allocation_usage (allocation_id, model_id, percentage, comment)
      VALUES (:allocation_id, :model_id, :percentage, :comment)
      RETURNING usage_id
    `
    const updateHistory = `
      INSERT INTO model_allocation_usage_history (usage_id, field, value, creator_full_name)
      VALUES (:usage_id, :field, :value, :creator_full_name)
      RETURNING usage_id
    `

    const [currentItem] = await this.sumDatabaseService.query(check, { model_id, allocation_id })

    if (currentItem) {
      const params = {
        percentage: percentage || currentItem.percentage,
        comment: comment || currentItem.comment,
        model_id,
        allocation_id
      }

      const [updatedItem] = await this.sumDatabaseService.query(update, params)

      if (percentage) {
        const params = {
          usage_id: updatedItem.usage_id,
          field: 'percentage',
          value: percentage,
          creator_full_name: 'ds_lead'
        }
        await this.sumDatabaseService.query(updateHistory, params)
      }

      if (comment) {
        const params = {
          usage_id: updatedItem.usage_id,
          field: 'comment',
          value: comment,
          creator_full_name: 'ds_lead'
        }
        await this.sumDatabaseService.query(updateHistory, params)
      }

    } else {
      const [newItem] = await this.sumDatabaseService.query(insert, { model_id, allocation_id, percentage, comment })

      if (percentage) {
        const params = {
          usage_id: newItem.usage_id,
          field: 'percentage',
          value: percentage,
          creator_full_name: 'ds_lead'
        }
        await this.sumDatabaseService.query(updateHistory, params)
      }

      if (comment) {
        const params = {
          usage_id: newItem.usage_id,
          field: 'comment',
          value: comment,
          creator_full_name: 'ds_lead'
        }
        await this.sumDatabaseService.query(updateHistory, params)
      }
    }

    return
  }
}
