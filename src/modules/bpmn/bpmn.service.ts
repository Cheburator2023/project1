import { Injectable } from '@nestjs/common'
import { MODEL_SOURCES } from 'src/system/common'
import { BpmnServiceFactory } from './factories'
import { BpmnInstanceEntity } from './entities'
import { CamundaService } from 'src/system/camunda/camunda.service'

@Injectable()
export class BpmnService {
  constructor(
    private readonly assignmentServiceFactory: BpmnServiceFactory,
    private readonly camundaService: CamundaService
  ) {
  }

  async getInstances(bpmnIds?: string[], source: MODEL_SOURCES = MODEL_SOURCES.SUM): Promise<BpmnInstanceEntity[]> {
    const assignmentService = this.assignmentServiceFactory.getService(source)
    return await assignmentService.getInstances(bpmnIds)
  }

  async tasks(groups: string[]): Promise<any[]> {
    return await this.camundaService.tasks(groups);
  }
}
