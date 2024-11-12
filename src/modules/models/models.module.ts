import { Module } from '@nestjs/common'
import { SumModelService, MrmModelService } from './services'
import { ModelsService } from './models.service'
import { ArtefactModule } from 'src/modules/artefacts/artefact.module'
import { AllocationModule } from 'src/modules/allocation/allocation.module'
import { UsageModule } from 'src/modules/usage/usage.module'
import { SumDatabaseModule } from 'src/system/sum-database/database.module'
import { MrmDatabaseModule } from 'src/system/mrm-database/database.module'

@Module({
  providers: [
    ModelsService,
    SumModelService,
    MrmModelService,
  ],
  imports: [
    SumDatabaseModule,
    MrmDatabaseModule,
    ArtefactModule,
    AllocationModule,
    UsageModule
  ],
  exports: [ModelsService]
})
export class ModelsModule {
}
