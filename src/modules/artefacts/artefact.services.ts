import { Injectable } from '@nestjs/common'
import { ArtefactServiceFactory } from './factories'
import { UpdateArtefactDto } from './dto'
import { MODEL_SOURCES } from 'src/system/common'
import { UpdateDateAfterExecution } from 'src/system/common/decorators/update-date-after-execution'
import { ModelServiceFactory } from 'src/modules/models/factories'
import { User } from 'src/decorators'
import { EnrichedArtefact } from './entities'

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

  async getMaxArtefactUpdateDate(model_id: string, source: MODEL_SOURCES): Promise<any> {
    const artefactService = this.artefactServiceFactory.getService(source)
    return await artefactService.getMaxArtefactUpdateDate(model_id)
  }

  async getArtefacts(source: MODEL_SOURCES, user: User): Promise<{ data: EnrichedArtefact[] }> {
    const artefactService = this.artefactServiceFactory.getService(source)
    return await artefactService.getArtefactWithPermissions(user)
  }
}
