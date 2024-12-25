import { Logger } from '@nestjs/common';
import { IBpmnService } from '../interfaces';
import { BpmnInstanceEntity } from '../entities';

export abstract class BaseBpmnService implements IBpmnService {
  protected abstract logger: Logger;

  protected constructor(public readonly databaseService) {}

  async getInstances(bpmnIds?: string[]): Promise<BpmnInstanceEntity[]> {
    const query = `
      SELECT 
        BI.BPMN_INSTANCE_ID,
        BI.MODEL_ID,
        STRING_AGG(AH.ASSIGNEE_NAME, ', ') AS ASSIGNEE_NAME,
        BI.EFFECTIVE_FROM
      FROM BPMN_INSTANCES BI
      LEFT JOIN ASSIGNEE_HIST AH ON BI.MODEL_ID = AH.MODEL_ID
      ${bpmnIds ? 'WHERE BI.BPMN_INSTANCE_ID = ANY(:bpmnIds::text[])' : ''}
      GROUP BY BI.BPMN_INSTANCE_ID, BI.MODEL_ID, BI.EFFECTIVE_FROM
    `;

    return await this.databaseService.query(query, bpmnIds ? { bpmnIds } : {});
  }
}