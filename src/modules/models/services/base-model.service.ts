import { Logger } from '@nestjs/common'
import { ModelEntity } from '../entities'
import { UpdateModelDto } from '../dto'
import { IModelService } from '../interfaces'

export abstract class BaseModelService implements IModelService {
  protected abstract modelsTableName: string
  protected abstract logger: Logger

  protected constructor(protected readonly databaseService) {
  }

  async updateModelName(data: Pick<UpdateModelDto, 'model_id' | 'model_name'>): Promise<boolean> {
    const { model_id, model_name } = data

    const model: ModelEntity | null = await this.getModelById(model_id)
    if (!model) {
      return false
    }

    if (model.model_name === model_name) {
      return false
    }

    await this.databaseService.query(
      `
      UPDATE
        ${ this.modelsTableName }
      SET model_name = :model_name
      WHERE model_id = :model_id
      `,
      {
        model_name,
        model_id: model.model_id
      }
    )

    await this.updateUpdateDate({
      update_date: new Date(),
      model_id
    })

    return true
  }

  async updateModelDesc(data: Pick<UpdateModelDto, 'model_id' | 'model_desc'>): Promise<boolean> {
    const { model_id, model_desc } = data

    const model: ModelEntity | null = await this.getModelById(model_id)
    if (!model) {
      return false
    }

    if (model.model_desc === model_desc) {
      return false
    }

    await this.databaseService.query(
      `
      UPDATE
        ${ this.modelsTableName }
      SET model_desc = :model_desc
      WHERE model_id = :model_id
      `,
      {
        model_desc,
        model_id: model.model_id
      }
    )

    await this.updateUpdateDate({
      update_date: new Date(),
      model_id
    })

    return true
  }

  async updateUpdateDate(data: Pick<UpdateModelDto, 'model_id' | 'update_date'>): Promise<boolean> {
    const { model_id, update_date = new Date() } = data

    const model: ModelEntity | null = await this.getModelById(model_id)
    if (!model) {
      return false
    }

    await this.databaseService.query(
      `
      UPDATE
        ${ this.modelsTableName }
      SET update_date = :update_date
      WHERE model_id = :model_id
      `,
      {
        update_date,
        model_id: model.model_id
      }
    )

    return true
  }

  async getModelById(model_id: string): Promise<ModelEntity | null> {
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
