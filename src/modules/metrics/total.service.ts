import { Injectable } from '@nestjs/common'

import { ImplementedService } from './implemented.service'
import { DevelopedService } from './developed.service'

@Injectable()
export class TotalService {
  constructor(
    private readonly implementedService: ImplementedService,
    private readonly developedService: DevelopedService
  ) {
  }

  async metric(
    startDate: string | null = null,
    endDate: string | null = null,
    stream: string[] | null = null
  ) {
    const { developedModels } = await this.developedService.metric(startDate, endDate, stream)
    const { implementedModels } = await this.implementedService.metric(startDate, endDate, stream)

    return {
      totalModels: {
        count: developedModels.count + implementedModels.count,
        delta: developedModels.delta + implementedModels.delta
      }
    }
  }
}

