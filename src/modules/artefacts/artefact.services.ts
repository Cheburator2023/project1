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

    const results = await this.artefactExecutionContextService.runWithContext(
      { artefactsBatch: artefacts, modelSource: source },
      async () => {
        const results: boolean[] = []
        for (const artefact of artefacts) {
          results.push(await artefactService.handleUpdateArtefact(artefact))
        }
        return results
      }
    )

    const hasChanges = results.some(Boolean)
    if (hasChanges) {
      const modelsService = this.modelsServiceFactory.getService(source)
      await modelsService.updateUpdateDate({
        model_id: artefacts[0].model_id,
        creator: artefacts[0].creator
      })
    }

    // Force cache update to ensure fresh data is available immediately
    // await this.modelsCacheService.forceUpdateCache()

    return true
  }

  async getMaxArtefactUpdateDate(
    model_id: string,
    source: MODEL_SOURCES
  ): Promise<any> {
    const artefactService = this.artefactServiceFactory.getService(source)
    return await artefactService.getMaxArtefactUpdateDate(model_id)
  }

  /**
   * Артефакты (метаданные полей) едины для SUM и MRM, а флаги прав
   * (is_editable_by_role_sum / is_editable_by_role_sum_rm) считаются
   * одной и той же матрицей по группам пользователя. Поэтому source
   * больше не нужен — всегда используем MRM-сервис как канонический.
   */
  async getArtefacts(
    user: UserType
  ): Promise<{ data: EnrichedArtefact[] }> {
    const artefactService = this.artefactServiceFactory.getService(
      MODEL_SOURCES.MRM
    )
    return await artefactService.getArtefactWithPermissions(user)
  }

  async getBlockListByModel(modelId: string): Promise<{ data: string[] }> {
    const artefactService = this.artefactServiceFactory.getService(
      MODEL_SOURCES.SUM
    )
    return await artefactService.getBlockListByModel(modelId)
  }
}
