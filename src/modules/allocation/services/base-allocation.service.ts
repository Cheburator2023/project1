import { Logger } from '@nestjs/common'
import { IAllocationService } from '../interfaces'
import { UpdateAllocationDto } from '../dto'
import { UpdateArtefactDto } from '../../artefacts/dto'

export abstract class BaseAllocationService implements IAllocationService {
  protected abstract modelsTableName: string
  protected abstract logger: Logger

  protected constructor(public readonly databaseService) {
  }

  handleUpdateAllocation(data: UpdateAllocationDto): Promise<boolean> {
    return Promise.resolve(true)
  }

  //@TODO: вынести в модуль models
  async getModelById(model_id: UpdateArtefactDto['model_id']): Promise<any> {
    const [model] = await this.databaseService.query(
      `
      SELECT * FROM ${ this.modelsTableName } WHERE model_id = :model_id
      `,
      {
        model_id
      }
    )

    return model || null
  }
}


