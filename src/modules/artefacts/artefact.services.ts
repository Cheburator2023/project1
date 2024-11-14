import { Injectable } from '@nestjs/common'
import { ArtefactServiceFactory } from './factories'
import { UpdateArtefactDto } from './dto'
import { MODEL_SOURCES } from 'src/system/common'

@Injectable()
export class ArtefactService {
  constructor(
    private readonly artefactServiceFactory: ArtefactServiceFactory
  ) {
  }

  async updateArtefact(data: UpdateArtefactDto, source: MODEL_SOURCES): Promise<void> {
    const artefactService = this.artefactServiceFactory.getService(source)
    await artefactService.handleUpdateArtefact(data)
  }
}
