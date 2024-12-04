import { Logger } from '@nestjs/common'
import { IAssignmentService } from '../interfaces'
import { AssignmentsWithRolesEntity } from '../entities'

export abstract class BaseAssignmentService implements IAssignmentService {
  protected abstract logger: Logger

  protected constructor(public readonly databaseService) {
  }

  async getAssignmentsWithRolesByModelId(modelIds?: string[]): Promise<AssignmentsWithRolesEntity[]> {
    const query = `
    SELECT ah.model_id,
      ah.functional_role,
      ah.effective_from
    FROM (
      SELECT model_id,
        functional_role,
        effective_from,
        ROW_NUMBER() OVER (
          PARTITION BY ah.model_id, ah.functional_role
          ORDER BY ah.effective_from DESC
        ) AS rn
      FROM assignee_hist AS ah
      ${ modelIds ? 'WHERE ah.model_id = ANY(:modelIds::text[])' : '' }
    ) AS ah
    WHERE ah.rn = 1
    ORDER BY ah.model_id, ah.functional_role;
  `

    return await this.databaseService.query(query, modelIds ? { modelIds } : {})
  }
}
