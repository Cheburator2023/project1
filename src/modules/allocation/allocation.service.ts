import { Injectable, Inject, forwardRef } from '@nestjs/common'
import { AllocationServiceFactory } from './factories'
import { UpdateAllocationDto } from './dto'
import { MODEL_SOURCES } from 'src/system/common'
import { UpdateDateAfterExecution } from 'src/system/common/decorators/update-date-after-execution'
import { ModelServiceFactory } from 'src/modules/models/factories'
import { ModelsCacheService } from 'src/modules/models/models-cache.service'

@Injectable()
export class AllocationService {
  constructor(
    private readonly allocationServiceFactory: AllocationServiceFactory,
    private readonly modelsServiceFactory: ModelServiceFactory,
    @Inject(forwardRef(() => ModelsCacheService))
    private readonly modelsCacheService: ModelsCacheService
  ) {
    Reflect.defineMetadata('modelsServiceFactory', modelsServiceFactory, this)
  }

  @UpdateDateAfterExecution()
  async updateAllocation(
    data: UpdateAllocationDto,
    source: MODEL_SOURCES
  ): Promise<boolean> {
    const allocationService = this.allocationServiceFactory.getService(source)
    const result = await allocationService.handleUpdateAllocation(data)

    if (result) {
      // Force cache update to ensure fresh data is available immediately
      await this.modelsCacheService.forceUpdateCache()
    }

    return result
  }
}
