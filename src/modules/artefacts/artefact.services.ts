import { Injectable, Inject, forwardRef } from '@nestjs/common'
import { ArtefactServiceFactory } from './factories'
import { UpdateArtefactDto } from './dto'
import { MODEL_SOURCES } from 'src/system/common'
import { ModelServiceFactory } from 'src/modules/models/factories'
import { UserType } from 'src/decorators'
import { EnrichedArtefact } from './entities'
import { ArtefactExecutionContextService } from './services'
import { ModelsCacheService } from 'src/modules/models/models-cache.service'

@Injectable()
export class ArtefactService {
  constructor(
    private readonly artefactServiceFactory: ArtefactServiceFactory,
    private readonly artefactExecutionContextService: ArtefactExecutionContextService,
    private readonly modelsServiceFactory: ModelServiceFactory,
    @Inject(forwardRef(() => ModelsCacheService))
    private readonly modelsCacheService: ModelsCacheService
  ) {}

  async updateArtefact(
    artefacts: UpdateArtefactDto[],
    source: MODEL_SOURCES
  ): Promise<boolean> {
    const artefactService = this.artefactServiceFactory.getService(source)

    await this.artefactExecutionContextService.runWithContext(
      { artefactsBatch: artefacts, modelSource: source },
      async () => {
        for (const artefact of artefacts) {
          await artefactService.handleUpdateArtefact(artefact)
        }
      }
    )

    const modelsService = this.modelsServiceFactory.getService(source)
    await modelsService.updateUpdateDate({ model_id: artefacts[0].model_id })

    // Force cache update to ensure fresh data is available immediately
    await this.modelsCacheService.forceUpdateCache()

    return true
  }

  async getMaxArtefactUpdateDate(
    model_id: string,
    source: MODEL_SOURCES
  ): Promise<any> {
    const artefactService = this.artefactServiceFactory.getService(source)
    return await artefactService.getMaxArtefactUpdateDate(model_id)
  }

  async getArtefacts(
    source: MODEL_SOURCES,
    user: UserType
  ): Promise<{ data: EnrichedArtefact[] }> {
    const artefactService = this.artefactServiceFactory.getService(source)
    return await artefactService.getArtefactWithPermissions(user)
  }
}
