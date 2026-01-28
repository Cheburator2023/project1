import { LoggerService } from 'src/system/logger/logger.service'
import { ModelEntity } from '../entities'
import { UpdateModelDto } from '../dto'
import { IModelService } from '../interfaces'
import { BaseArtefactService } from 'src/modules/artefacts/services'
import { formatDateTime } from 'src/system/common'

export abstract class BaseModelService implements IModelService {
  protected abstract modelsTableName: string

  protected constructor(
    protected readonly artefactService: BaseArtefactService,
    protected readonly databaseService,
    protected readonly logger: LoggerService
  ) {}

  async updateModelName(
    data: Pick<UpdateModelDto, 'model_id' | 'model_name' | 'creator'>
  ): Promise<boolean> {
    this.logger.info('Updating model name', 'ОбновлениеНазванияМодели', {
      model_id: data.model_id,
      new_model_name: data.model_name
    })

    const { model_id, model_name, creator } = data

    try {
      const model: ModelEntity | null = await this.getModelById(model_id)
      if (!model) {
        this.logger.warn(
          'Model not found for name update',
          'МодельНеНайденаДляОбновленияНазвания',
          {
            model_id
          }
        )
        return false
      }

      if (model.model_name === model_name) {
        this.logger.info(
          'Model name unchanged, skipping update',
          'НазваниеМоделиНеИзмененоПропускОбновления',
          {
            model_id
          }
        )
        return false
      }

      await this.databaseService.query(
        `
        UPDATE
          ${this.modelsTableName}
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
        model_id,
        creator
      })

      this.logger.info(
        'Model name updated successfully',
        'НазваниеМоделиУспешноОбновлено',
        {
          model_id,
          old_name: model.model_name,
          new_name: model_name
        }
      )

      return true
    } catch (error) {
      this.logger.error(
        'Error updating model name',
        'ОшибкаОбновленияНазванияМодели',
        error,
        {
          model_id,
          model_name
        }
      )
      return false
    }
  }

  async updateUpdateDate(
    data: Pick<UpdateModelDto, 'model_id'> &
      Partial<Pick<UpdateModelDto, 'update_date' | 'creator'>>
  ): Promise<boolean> {
    const { model_id, update_date = new Date(), creator } = data
    const artefact_tech_label = 'update_date'

    this.logger.info(
      'Updating model update date',
      'ОбновлениеДатыОбновленияМодели',
      {
        model_id,
        update_date
      }
    )

    try {
      const model: ModelEntity | null = await this.getModelById(model_id)
      if (!model) {
        this.logger.warn(
          'Model not found for update date',
          'МодельНеНайденаДляОбновленияДаты',
          {
            model_id
          }
        )
        return false
      }

      await this.artefactService.handleUpdateArtefact({
        model_id,
        artefact_tech_label,
        artefact_string_value: formatDateTime(new Date()),
        artefact_value_id: null,
        creator
      })

      await this.databaseService.query(
        `
        UPDATE
          ${this.modelsTableName}
        SET update_date = :update_date
        WHERE model_id = :model_id
        `,
        {
          update_date,
          model_id: model.model_id
        }
      )

      this.logger.info(
        'Model update date updated successfully',
        'ДатаОбновленияМоделиУспешноОбновлена',
        {
          model_id
        }
      )

      return true
    } catch (error) {
      this.logger.error(
        'Error updating model update date',
        'ОшибкаОбновленияДатыОбновленияМодели',
        error,
        {
          model_id
        }
      )
      return false
    }
  }

  async getModelById(model_id: string): Promise<ModelEntity | null> {
    this.logger.info('Getting model by ID', 'ПолучениеМоделиПоИдентификатору', {
      model_id
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
          model_id,
          model_name: model.model_name
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
        'ОшибкаПолученияМоделиПоИдентификатору',
        error,
        {
          model_id
        }
      )
      throw error
    }
  }
}
