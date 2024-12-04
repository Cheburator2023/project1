import { Injectable } from '@nestjs/common'
import { MODEL_SOURCES } from 'src/system/common'
import { SumBpmnService } from '../services'
import { IBpmnService } from '../interfaces'

@Injectable()
export class BpmnServiceFactory {
  constructor(
    private readonly sumBpmnService: SumBpmnService
  ) {
  }

  getService(source: MODEL_SOURCES): IBpmnService {
    let service: IBpmnService

    switch (source) {
      case MODEL_SOURCES.SUM:
        service = this.sumBpmnService
        break
      default:
        throw new Error(`Unknown model source ${ source }`)
    }

    return service
  }
}
