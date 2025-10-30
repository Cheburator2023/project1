import { LoggerService } from 'src/system/logger/logger.service'
import { IAllocationService } from '../interfaces'
import { UpdateAllocationDto } from '../dto'
import { UpdateArtefactDto } from '../../artefacts/dto'

export abstract class BaseAllocationService implements IAllocationService {
  protected abstract modelsTableName: string

  protected constructor(
    public readonly databaseService,
    protected readonly logger: LoggerService
  ) {}

  handleUpdateAllocation(data: UpdateAllocationDto): Promise<boolean> {
    return Promise.resolve(true)
  }

  //@TODO: вынести в модуль models
  async getModelById(model_id: UpdateArtefactDto['model_id']): Promise<any> {
    this.logger.info('Getting model by ID', 'ПолучениеМоделиПоИдентификатору', {
      model_id,
      table_name: this.modelsTableName
    })

    try {
      const [model] = await this.databaseService.query(
        `
        SELECT * FROM ${this.modelsTableName} WHERE model_id = :model_id
        `,
        {
          model_id
        }
      )

      if (model) {
        this.logger.info('Model found successfully', 'МодельУспешноНайдена', {
          model_id
        })
      } else {
        this.logger.warn('Model not found', 'МодельНеНайдена', {
          model_id
        })
      }

      return model || null
    } catch (error) {
      this.logger.error(
        'Error getting model by ID',
        'ОшибкаПолученияМодели',
        error,
        {
          model_id
        }
      )
      throw error
    }
  }
}
