import { Logger } from '@nestjs/common'
import { IBpmnService } from '../interfaces'
import { BpmnInstanceEntity } from '../entities'

export abstract class BaseBpmnService implements IBpmnService {
  protected abstract logger: Logger

  protected constructor(public readonly databaseService) {
  }

  async getInstances(bpmnIds?: string[]): Promise<BpmnInstanceEntity[]> {
    const query = `
    SELECT *
    FROM BPMN_INSTANCES
    ${bpmnIds ? 'WHERE BPMN_INSTANCE_ID = ANY(:bpmnIds::text[])' : ''}
  `

    return await this.databaseService.query(query, bpmnIds ? { bpmnIds } : {})
  }
}
