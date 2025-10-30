import { LoggerService } from 'src/system/logger/logger.service'
import { IBpmnService } from '../interfaces'
import { BpmnInstanceEntity } from '../entities'

export abstract class BaseBpmnService implements IBpmnService {
  protected constructor(
    public readonly databaseService,
    protected readonly logger: LoggerService
  ) {}

  async getInstances(bpmnIds?: string[]): Promise<BpmnInstanceEntity[]> {
    this.logger.info('Getting BPMN instances', 'ПолучениеЭкземпляровBPMN', {
      bpmn_ids_count: bpmnIds?.length || 0
    })

    try {
      const query = `
        SELECT *
        FROM BPMN_INSTANCES
        ${bpmnIds ? 'WHERE BPMN_INSTANCE_ID = ANY(:bpmnIds::text[])' : ''}
      `

      const result = await this.databaseService.query(
        query,
        bpmnIds ? { bpmnIds } : {}
      )

      this.logger.info(
        'BPMN instances retrieved successfully',
        'ЭкземплярыBPMNУспешноПолучены',
        {
          instances_count: result.length,
          bpmn_ids_count: bpmnIds?.length || 0
        }
      )

      return result
    } catch (error) {
      this.logger.error(
        'Error getting BPMN instances',
        'ОшибкаПолученияЭкземпляровBPMN',
        error,
        {
          bpmn_ids_count: bpmnIds?.length || 0
        }
      )
      throw error
    }
  }
}
