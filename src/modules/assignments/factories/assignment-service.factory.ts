import { Injectable } from '@nestjs/common'
import { MODEL_SOURCES } from 'src/system/common'
import { SumAssignmentService } from '../services'
import { IAssignmentService } from '../interfaces'

@Injectable()
export class AssignmentServiceFactory {
  constructor(
    private readonly sumAssignmentService: SumAssignmentService
  ) {
  }

  getService(source: MODEL_SOURCES): IAssignmentService {
    let service: IAssignmentService

    switch (source) {
      case MODEL_SOURCES.SUM:
        service = this.sumAssignmentService
        break
      default:
        throw new Error(`Unknown model source ${ source }`)
    }

    return service
  }
}
