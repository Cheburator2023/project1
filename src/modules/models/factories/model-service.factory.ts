import { Injectable } from '@nestjs/common'
import { MODEL_SOURCES } from 'src/system/common'
import { SumModelService, MrmModelService } from '../services'
import { IModelService } from '../interfaces'

@Injectable()
export class ModelServiceFactory {
  constructor(
    private readonly sumModelService: SumModelService,
    private readonly mrmModelService: MrmModelService
  ) {}

  getService(source: MODEL_SOURCES): IModelService {
    let service: IModelService

    switch (source) {
      case MODEL_SOURCES.MRM:
        service = this.mrmModelService
        break
      case MODEL_SOURCES.SUM:
        service = this.sumModelService
        break
      default:
        throw new Error(`Unknown model source ${source}`)
    }

    return service
  }
}
