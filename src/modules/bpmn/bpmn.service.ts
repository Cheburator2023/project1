import { Injectable } from '@nestjs/common'
import { MODEL_SOURCES } from 'src/system/common'
import { BpmnServiceFactory } from './factories'
import { BpmnInstanceEntity } from './entities'

@Injectable()
export class BpmnService {
  constructor(
    private readonly assignmentServiceFactory: BpmnServiceFactory
  ) {
  }

  async getInstances(bpmnIds?: string[], source: MODEL_SOURCES = MODEL_SOURCES.SUM): Promise<BpmnInstanceEntity[]> {
    const assignmentService = this.assignmentServiceFactory.getService(source)
    return await assignmentService.getInstances(bpmnIds)
  }
}
