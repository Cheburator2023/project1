import { Injectable } from '@nestjs/common'
import { MODEL_SOURCES } from 'src/system/common'
import { AssignmentServiceFactory } from './factories'
import { AssigneeHistWithStreamEntity } from './entities'

@Injectable()
export class AssignmentService {
  constructor(
    private readonly assignmentServiceFactory: AssignmentServiceFactory
  ) {
  }

  async getAssigneeHist(source: MODEL_SOURCES = MODEL_SOURCES.SUM): Promise<AssigneeHistWithStreamEntity[]> {
    const assignmentService = this.assignmentServiceFactory.getService(source)
    return await assignmentService.getAssigneeHistWithStream()
  }
}
