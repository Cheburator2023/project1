import { Inject, Injectable } from '@nestjs/common'
import { MODEL_SOURCES } from 'src/system/common'
import { MrmArtefactService, SumArtefactService } from '../services'
import { IArtefactHandler, IArtefactService } from '../interfaces'

@Injectable()
export class ArtefactServiceFactory {
  constructor(
    private readonly sumArtefactService: SumArtefactService,
    private readonly mrmArtefactService: MrmArtefactService,
    @Inject('MrmArtefactHandlers') private readonly mrmHandlers: IArtefactHandler[]
  ) {
  }

  getService(source: MODEL_SOURCES): IArtefactService {
    let service: IArtefactService

    switch (source) {
      case MODEL_SOURCES.MRM:
        service = this.mrmArtefactService

        this.mrmHandlers.forEach((handler: IArtefactHandler) => handler.setArtefactService(service))
        break
      case MODEL_SOURCES.SUM:
        service = this.sumArtefactService
        break
      default:
        throw new Error(`Unknown model source ${ source }`)
    }

    return service
  }
}
