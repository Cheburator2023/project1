import { Injectable } from '@nestjs/common'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { BaseAllocationService } from './base-allocation.service'
import { IAllocationService } from '../interfaces'
import { UpdateAllocationDto } from '../dto'
import { MRM_TABLES } from '../constants'
import { AllocationEntity } from '../entities'
import { LoggerService } from 'src/system/logger/logger.service'

@Injectable()
export class MrmAllocationService
  extends BaseAllocationService
  implements IAllocationService
{
  protected modelsTableName = MRM_TABLES.MODELS

  constructor(databaseService: MrmDatabaseService, logger: LoggerService) {
    super(databaseService, logger)
  }

  async handleUpdateAllocation(data: UpdateAllocationDto): Promise<boolean> {
    this.logger.info(
      'Handling update allocation',
      'ОбработкаОбновленияРаспределения',
      data
    )

    const { model_id, gbl_id } = data

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

        allocationId = allocationItem.allocation_id
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

        allocationId = allocationItem.allocation_id
      }

      const allocationHistItem = await this.insertAllocationHistory(
        allocationId,
        data
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
  ): Promise<AllocationEntity | null> {
    this.logger.info('Getting allocation', 'ПолучениеРаспределения', {
      model_id,
      gbl_id
    })

    try {
      const [allocation] = await this.databaseService.query(
        `
        SELECT * FROM models_allocation WHERE model_id = :model_id AND gbl_id = :gbl_id;
        `,
        {
          model_id,
          gbl_id
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

  async updateAllocation(
    data: UpdateAllocationDto
  ): Promise<AllocationEntity | null> {
    const { model_id, gbl_id, percent, comment, creator } = data

    this.logger.info('Updating allocation', 'ОбновлениеРаспределения', {
      model_id,
      gbl_id
    })

    try {
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

  async insertAllocation(
    data: UpdateAllocationDto
  ): Promise<AllocationEntity | null> {
    const { model_id, gbl_id, percent, comment, creator } = data

    this.logger.info('Inserting allocation', 'ДобавлениеРаспределения', {
      model_id,
      gbl_id
    })

    try {
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

      if (allocationItem) {
        this.logger.info(
          'Allocation inserted successfully',
          'РаспределениеУспешноДобавлено',
          {
            model_id,
            gbl_id,
            allocation_id: allocationItem.allocation_id
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

  async insertAllocationHistory(
    allocation_id: any,
    data: UpdateAllocationDto
  ): Promise<AllocationEntity | null> {
    const { model_id, gbl_id, percent, comment, creator } = data

    this.logger.info(
      'Inserting allocation history',
      'ДобавлениеИсторииРаспределения',
      {
        allocation_id,
        model_id,
        gbl_id
      }
    )

    try {
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

      if (allocationHistItem) {
        this.logger.info(
          'Allocation history inserted successfully',
          'ИсторияРаспределенияУспешноДобавлена',
          {
            allocation_id
          }
        )
      } else {
        this.logger.warn(
          'Allocation history insert returned no rows',
          'ДобавлениеИсторииРаспределенияНеВернулоДанных',
          {
            allocation_id
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
          allocation_id
        }
      )
      throw error
    }
  }
}
