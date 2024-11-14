import { Module } from '@nestjs/common'
import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { ArtefactService } from './artefact.services'
import { SumArtefactService, MrmArtefactService } from './services'
import { ArtefactServiceFactory } from './factories'
import { artefactHandlersProvider } from './handlers'

@Module({
  providers: [
    MrmDatabaseService,
    SumDatabaseService,
    ArtefactServiceFactory,
    ArtefactService,
    SumArtefactService,
    MrmArtefactService,
    ...artefactHandlersProvider,
    {
      provide: 'MrmArtefactHandlers',
      useFactory: (...handlers) => handlers,
      inject: artefactHandlersProvider
    }
  ],
  exports: [ArtefactService]
})
export class ArtefactModule {
}
