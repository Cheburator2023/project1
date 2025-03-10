import { Injectable } from '@nestjs/common'
import { MODEL_SOURCES } from 'src/system/common'
import { MrmUsageService, SumUsageService } from '../services'
import { IUsageService } from '../interfaces'

@Injectable()
export class UsageServiceFactory {
  constructor(
    private readonly mrmUsageService: MrmUsageService,
    private readonly sumUsageService: SumUsageService
  ) {
  }

  getService(source: MODEL_SOURCES): IUsageService {
    let service: IUsageService

    switch (source) {
      case MODEL_SOURCES.MRM:
        service = this.mrmUsageService
        break
      case MODEL_SOURCES.SUM:
        service = this.sumUsageService
        break
      default:
        throw new Error(`Unknown allocation source ${ source }`)
    }

    return service
  }
}
