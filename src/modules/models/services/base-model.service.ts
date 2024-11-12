import { Logger } from '@nestjs/common'
import { ModelEntity } from '../entities'
import { UpdateModelNameDto, UpdateModelDescDto } from '../dto'
import { IModelService } from '../interfaces'

export abstract class BaseModelService implements IModelService {
  protected abstract modelsTableName: string
  protected abstract logger: Logger

  protected constructor(protected readonly databaseService) {
  }

  async updateModelName(data: UpdateModelNameDto): Promise<void> {
    const { model_id, model_name } = data

    const model: ModelEntity | null = await this.getModelById(model_id)
    if (!model) {
      return
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
  }

  async updateModelDesc(data: UpdateModelDescDto): Promise<void> {
    const { model_id, model_desc } = data

    const model: ModelEntity | null = await this.getModelById(model_id)
    if (!model) {
      return
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
  }

  private async getModelById(model_id: string): Promise<ModelEntity | null> {
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
