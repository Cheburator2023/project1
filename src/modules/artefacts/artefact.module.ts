import { Module } from '@nestjs/common'
import { ArtefactService } from './artefact.services'
import { SumArtefactService, MrmArtefactService } from './services'
import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'

@Module({
  providers: [
    ArtefactService,
    SumArtefactService,
    MrmArtefactService,
    SumDatabaseService,
    MrmDatabaseService
  ],
  exports: [ArtefactService]
})
export class ArtefactModule {
}
