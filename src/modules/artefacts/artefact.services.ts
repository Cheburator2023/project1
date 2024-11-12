import { Injectable } from '@nestjs/common'
import { MrmArtefactService, SumArtefactService } from './services'
import { UpdateArtefactDto } from './dto'
import { MODEL_SOURCES } from 'src/system/common'

@Injectable()
export class ArtefactService {
  constructor(
    private readonly sumArtefactService: SumArtefactService,
    private readonly mrmArtefactService: MrmArtefactService
  ) {
  }

  async updateArtefact(data: UpdateArtefactDto, source: MODEL_SOURCES): Promise<void> {
    if (source === MODEL_SOURCES.SUM) {
      await this.sumArtefactService.updateArtefact(data)
    } else if (source === MODEL_SOURCES.MRM) {
      await this.mrmArtefactService.updateArtefact(data)
    } else {
      throw new Error(`Unknown model source: ${ source }`)
    }
  }
}
