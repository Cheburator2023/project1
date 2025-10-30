import { Injectable } from '@nestjs/common'
import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { BaseAllocationService } from './base-allocation.service'
import { IAllocationService } from '../interfaces'
import { SUM_TABLES } from '../constants'
import { UpdateAllocationDto } from '../dto'
import { LoggerService } from 'src/system/logger/logger.service'

@Injectable()
export class SumAllocationService
  extends BaseAllocationService
  implements IAllocationService
{
  protected modelsTableName = SUM_TABLES.MODELS

  constructor(databaseService: SumDatabaseService, logger: LoggerService) {
    super(databaseService, logger)
  }

  async handleUpdateAllocation(data: UpdateAllocationDto): Promise<boolean> {
    this.logger.info(
      'Handling update allocation',
      'ОбработкаОбновленияРаспределения',
      data
    )

    const { model_id, gbl_id, percent, comment, creator } = data

    try {
      const model = await this.getModelById(model_id)
      if (!model) {
        this.logger.warn(
          'Model not found for allocation update',
          'МодельНеНайденаДляОбновленияРаспределения',
          {
            model_id
          }
        )
        return false
      }

      const allocation = await this.getAllocation(model_id, gbl_id)
      let allocationId = null

      if (!allocation) {
        this.logger.info(
          'Inserting new allocation',
          'ДобавлениеНовогоРаспределения',
          {
            model_id,
            gbl_id
          }
        )

        const allocationItem = await this.insertAllocation(data)

        if (!allocationItem) {
          this.logger.error(
            'Failed to insert allocation',
            'ОшибкаДобавленияРаспределения',
            null,
            {
              model_id,
              gbl_id
            }
          )
          return false
        }

        allocationId = allocationItem.usage_id
      } else {
        this.logger.info(
          'Updating existing allocation',
          'ОбновлениеСуществующегоРаспределения',
          {
            model_id,
            gbl_id
          }
        )

        const allocationItem = await this.updateAllocation(data)

        if (!allocationItem) {
          this.logger.error(
            'Failed to update allocation',
            'ОшибкаОбновленияРаспределения',
            null,
            {
              model_id,
              gbl_id
            }
          )
          return false
        }

        allocationId = allocationItem.usage_id
      }

      // обновляем результат
      const allocationHistItem = await this.insertAllocationHistory(
        allocationId,
        {
          field:
            percent !== null
              ? 'percentage'
              : comment !== null
              ? 'comment'
              : null,
          value: percent !== null ? percent : comment !== null ? comment : null,
          creator
        }
      )

      if (!allocationHistItem) {
        this.logger.error(
          'Failed to insert allocation history',
          'ОшибкаДобавленияИсторииРаспределения',
          null,
          {
            allocationId
          }
        )
        return false
      }

      this.logger.info(
        'Allocation update completed successfully',
        'ОбновлениеРаспределенияУспешноЗавершено',
        {
          model_id,
          gbl_id,
          allocationId
        }
      )

      return true
    } catch (error) {
      this.logger.error(
        'Error handling allocation update',
        'ОшибкаОбработкиОбновленияРаспределения',
        error,
        data
      )
      return false
    }
  }

  async getAllocation(
    model_id: UpdateAllocationDto['model_id'],
    gbl_id: UpdateAllocationDto['gbl_id']
  ): Promise<any> {
    this.logger.info('Getting allocation', 'ПолучениеРаспределения', {
      model_id,
      gbl_id
    })

    try {
      const [allocation] = await this.databaseService.query(
        `
        SELECT * FROM model_allocation_usage WHERE model_id = :model_id AND allocation_id = :allocation_id;
        `,
        {
          model_id,
          allocation_id: gbl_id
        }
      )

      if (allocation) {
        this.logger.info('Allocation found', 'РаспределениеНайдено', {
          model_id,
          gbl_id
        })
      } else {
        this.logger.info('Allocation not found', 'РаспределениеНеНайдено', {
          model_id,
          gbl_id
        })
      }

      return allocation || null
    } catch (error) {
      this.logger.error(
        'Error getting allocation',
        'ОшибкаПолученияРаспределения',
        error,
        {
          model_id,
          gbl_id
        }
      )
      throw error
    }
  }

  async updateAllocation(data: UpdateAllocationDto): Promise<any> {
    const { model_id, gbl_id, percent, comment } = data

    this.logger.info('Updating allocation', 'ОбновлениеРаспределения', {
      model_id,
      gbl_id
    })

    try {
      const [allocationItem] = await this.databaseService.query(
        `
        UPDATE model_allocation_usage
        SET percentage = COALESCE(:percentage, percentage),
            comment    = COALESCE(:comment, comment)
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

      if (allocationItem) {
        this.logger.info(
          'Allocation updated successfully',
          'РаспределениеУспешноОбновлено',
          {
            model_id,
            gbl_id
          }
        )
      } else {
        this.logger.warn(
          'Allocation update returned no rows',
          'ОбновлениеРаспределенияНеВернулоДанных',
          {
            model_id,
            gbl_id
          }
        )
      }

      return allocationItem || null
    } catch (error) {
      this.logger.error(
        'Error updating allocation',
        'ОшибкаОбновленияРаспределения',
        error,
        {
          model_id,
          gbl_id
        }
      )
      throw error
    }
  }

  async insertAllocation(data: UpdateAllocationDto): Promise<any> {
    const { model_id, gbl_id, percent, comment } = data

    this.logger.info('Inserting allocation', 'ДобавлениеРаспределения', {
      model_id,
      gbl_id
    })

    try {
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

      if (allocationItem) {
        this.logger.info(
          'Allocation inserted successfully',
          'РаспределениеУспешноДобавлено',
          {
            model_id,
            gbl_id,
            usage_id: allocationItem.usage_id
          }
        )
      } else {
        this.logger.warn(
          'Allocation insert returned no rows',
          'ДобавлениеРаспределенияНеВернулоДанных',
          {
            model_id,
            gbl_id
          }
        )
      }

      return allocationItem || null
    } catch (error) {
      this.logger.error(
        'Error inserting allocation',
        'ОшибкаДобавленияРаспределения',
        error,
        {
          model_id,
          gbl_id
        }
      )
      throw error
    }
  }

  async insertAllocationHistory(usage_id: any, data: any): Promise<any> {
    const { field, value, creator } = data

    this.logger.info(
      'Inserting allocation history',
      'ДобавлениеИсторииРаспределения',
      {
        usage_id,
        field
      }
    )

    try {
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

      if (allocationHistItem) {
        this.logger.info(
          'Allocation history inserted successfully',
          'ИсторияРаспределенияУспешноДобавлена',
          {
            usage_id
          }
        )
      } else {
        this.logger.warn(
          'Allocation history insert returned no rows',
          'ДобавлениеИсторииРаспределенияНеВернулоДанных',
          {
            usage_id
          }
        )
      }

      return allocationHistItem || null
    } catch (error) {
      this.logger.error(
        'Error inserting allocation history',
        'ОшибкаДобавленияИсторииРаспределения',
        error,
        {
          usage_id
        }
      )
      throw error
    }
  }
}
