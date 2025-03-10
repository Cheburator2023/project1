import { Injectable } from '@nestjs/common'
import { AllocationServiceFactory } from './factories'
import { UpdateAllocationDto } from './dto'
import { MODEL_SOURCES } from 'src/system/common'
import { UpdateDateAfterExecution } from 'src/system/common/decorators/update-date-after-execution'
import { ModelServiceFactory } from 'src/modules/models/factories'

@Injectable()
export class AllocationService {
  constructor(
    private readonly allocationServiceFactory: AllocationServiceFactory,
    private readonly modelsServiceFactory: ModelServiceFactory
  ) {
    Reflect.defineMetadata('modelsServiceFactory', modelsServiceFactory, this)
  }

  @UpdateDateAfterExecution()
  async updateAllocation(data: UpdateAllocationDto, source: MODEL_SOURCES): Promise<boolean> {
    const allocationService = this.allocationServiceFactory.getService(source)
    return await allocationService.handleUpdateAllocation(data)
  }
}
