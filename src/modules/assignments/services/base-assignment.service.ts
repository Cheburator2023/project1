import { Logger } from '@nestjs/common'
import { IAssignmentService } from '../interfaces'
import { AssigneeHistWithStreamEntity } from '../entities'

export abstract class BaseAssignmentService implements IAssignmentService {
  protected abstract logger: Logger

  protected constructor(public readonly databaseService) {
  }

  async getAssigneeHistWithStream(): Promise<AssigneeHistWithStreamEntity[]> {
    return await this.databaseService.query(
      `
      WITH AssigneeHistRanked AS (
        SELECT
          ah.*,
          ROW_NUMBER() OVER (
            PARTITION BY ah.model_id, ah.functional_role
            ORDER BY ah.effective_to DESC
          ) AS rn
        FROM assignee_hist AS ah
      ),
      ArtefactRealizationsRanked AS (
        SELECT
          ar.model_id,
          ar.artefact_id,
          ar.artefact_string_value,
          ROW_NUMBER() OVER (
            PARTITION BY ar.model_id
            ORDER BY ar.effective_to DESC
          ) AS rn
        FROM artefact_realizations AS ar
        JOIN artefacts AS a
          ON ar.artefact_id = a.artefact_id
        WHERE a.artefact_tech_label = 'Departament'
      )
      SELECT
        ah.model_id,
        ah.functional_role,
        ah.lead_name,
        ah.assignee_name,
        ah.effective_from,
        ar.artefact_string_value AS ds_stream
      FROM AssigneeHistRanked AS ah
      INNER JOIN ArtefactRealizationsRanked AS ar
        ON ah.model_id = ar.model_id
      WHERE ah.rn = 1
        AND ar.rn = 1;
      `
    )
  }
}
