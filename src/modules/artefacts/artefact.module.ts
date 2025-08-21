import { forwardRef, Module } from '@nestjs/common'
import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { ModelsModule } from 'src/modules/models/models.module'
import { ArtefactService } from './artefact.services'
import { SumArtefactService, MrmArtefactService, ArtefactExecutionContextService, ArtefactRealizationsService } from './services'
import { ArtefactRealizationsController } from './api/artefact-realizations.controller'
import { ArtefactServiceFactory } from './factories'
import { artefactHandlersProvider } from './handlers'

@Module({
  imports: [forwardRef(() => ModelsModule)],
  providers: [
    MrmDatabaseService,
    SumDatabaseService,
    ArtefactServiceFactory,
    ArtefactService,
    SumArtefactService,
    MrmArtefactService,
    ArtefactExecutionContextService,
    ArtefactRealizationsService,
    ...artefactHandlersProvider,
    {
      provide: 'MrmArtefactHandlers',
      useFactory: (...handlers) => handlers,
      inject: artefactHandlersProvider
    }
  ],
  exports: [ArtefactService],
  controllers: [ArtefactRealizationsController]
})
export class ArtefactModule {
}
