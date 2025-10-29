import { Module, CacheModule } from '@nestjs/common'
import { SumModelService, MrmModelService } from './services'
import { ModelsService } from './models.service'
import { ModelsCacheService } from './models-cache.service'
import { ArtefactModule } from 'src/modules/artefacts/artefact.module'
import { AllocationModule } from 'src/modules/allocation/allocation.module'
import { UsageModule } from 'src/modules/usage/usage.module'
import { SumDatabaseModule } from 'src/system/sum-database/database.module'
import { MrmDatabaseModule } from 'src/system/mrm-database/database.module'
import { ModelServiceFactory } from './factories'
import { ModelMergeService } from './services/model-merge.service'
import { ModelDefaultsService } from './services/model-defaults.service'
import { ModelMergePrefetchService } from './services/model-merge-prefetch.service'

@Module({
  providers: [
    ModelServiceFactory,
    ModelsService,
    ModelsCacheService,
    SumModelService,
    MrmModelService,
    ModelMergeService,
    ModelDefaultsService,
    ModelMergePrefetchService
  ],
  imports: [
    SumDatabaseModule,
    MrmDatabaseModule,
    ArtefactModule,
    AllocationModule,
    UsageModule,
    CacheModule.register({
      ttl: 300, // 5 minutes
      max: 100 // maximum number of items in cache
    })
  ],
  exports: [
    ModelServiceFactory,
    ModelsService,
    ModelsCacheService,
    MrmModelService,
    SumModelService,
    ModelMergeService,
    ModelDefaultsService,
    ModelMergePrefetchService
  ]
})
export class ModelsModule {}
