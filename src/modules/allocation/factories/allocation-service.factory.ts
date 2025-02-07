import { Injectable } from '@nestjs/common'
import { MODEL_SOURCES } from 'src/system/common'
import { MrmAllocationService, SumAllocationService } from '../services'
import { IAllocationService } from '../interfaces'

@Injectable()
export class AllocationServiceFactory {
  constructor(
    private readonly sumAllocationService: SumAllocationService,
    private readonly mrmAllocationService: MrmAllocationService
  ) {
  }

  getService(source: MODEL_SOURCES): IAllocationService {
    let service: IAllocationService

    switch (source) {
      case MODEL_SOURCES.MRM:
        service = this.mrmAllocationService
        break
      case MODEL_SOURCES.SUM:
        service = this.sumAllocationService
        break
      default:
        throw new Error(`Unknown allocation source ${ source }`)
    }

    return service
  }
}
