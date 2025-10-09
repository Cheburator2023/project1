import { Inject, Injectable } from '@nestjs/common'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { BaseArtefactService } from './base-artefact.service'
import { MRM_TABLES } from '../constants'
import { IArtefactService, IArtefactHandler } from '../interfaces'
import { UpdateArtefactDto } from '../dto'
import { LoggerService } from 'src/system/logger/logger.service'

@Injectable()
export class MrmArtefactService extends BaseArtefactService implements IArtefactService {
  protected modelsTableName = MRM_TABLES.MODELS
  protected artefactsTableName = MRM_TABLES.ARTEFACTS
  protected artefactValuesTableName = MRM_TABLES.ARTEFACT_VALUES
  protected artefactRealizationsTableName = MRM_TABLES.ARTEFACT_REALIZATIONS

  constructor(
    databaseService: MrmDatabaseService,
    @Inject('MrmArtefactHandlers') private readonly handlers: IArtefactHandler[],
    logger: LoggerService
  ) {
    super(databaseService, logger)
  }

  async handleUpdateArtefact(artefactData: UpdateArtefactDto): Promise<boolean> {
    this.logger.info('Handling update artefact with handlers', 'ОбработкаОбновленияАртефактаСОбработчиками', {
      model_id: artefactData.model_id,
      artefact_tech_label: artefactData.artefact_tech_label,
      handlers_count: this.handlers.length
    })

    const handler = this.handlers.find(handler => handler.supports(artefactData.artefact_tech_label))
    let result

    if (handler) {
      this.logger.info('Using specific handler for artefact', 'ИспользованиеСпецифическогоОбработчикаДляАртефакта', {
        artefact_tech_label: artefactData.artefact_tech_label,
        handler_name: handler.constructor.name
      })
      result = await handler.handle(artefactData)
    } else {
      this.logger.info('Using base handler for artefact', 'ИспользованиеБазовогоОбработчикаДляАртефакта', {
        artefact_tech_label: artefactData.artefact_tech_label
      })
      result = await super.handleUpdateArtefact(artefactData)
    }

    this.logger.info('Artefact update handling completed', 'ОбработкаОбновленияАртефактаЗавершена', {
      model_id: artefactData.model_id,
      artefact_tech_label: artefactData.artefact_tech_label,
      success: result
    })

    return result
  }
}
