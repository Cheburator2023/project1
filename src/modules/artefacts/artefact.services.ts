import { Injectable } from '@nestjs/common'
import { ArtefactServiceFactory } from './factories'
import { UpdateArtefactDto } from './dto'
import { MODEL_SOURCES } from 'src/system/common'
import { UpdateDateAfterExecution } from 'src/system/common/decorators/update-date-after-execution'
import { ModelServiceFactory } from 'src/modules/models/factories'

@Injectable()
export class ArtefactService {
  constructor(
    private readonly artefactServiceFactory: ArtefactServiceFactory,
    private readonly modelsServiceFactory: ModelServiceFactory
  ) {
    Reflect.defineMetadata('modelsServiceFactory', modelsServiceFactory, this)
  }

  @UpdateDateAfterExecution()
  async updateArtefact(data: UpdateArtefactDto, source: MODEL_SOURCES): Promise<boolean> {
    const artefactService = this.artefactServiceFactory.getService(source)
    return await artefactService.handleUpdateArtefact(data)
  }
}
