import { Injectable } from '@nestjs/common'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { ModelSource } from 'src/api/dto/index.dto'
import {
  HistoryReadSource,
  isHistoryReadSource
} from '../constants/history-read-source'
import { sql as loadArtefactHistorySourceSql } from '../sql/load-artefact-history-source'

@Injectable()
export class ArtefactHistorySourceService {
  constructor(private readonly mrmDatabaseService: MrmDatabaseService) {}

  async resolveReadSource(
    artefactTechLabel: string,
    modelSource: ModelSource
  ): Promise<HistoryReadSource> {
    const rows = await this.mrmDatabaseService.query(
      loadArtefactHistorySourceSql,
      {
        artefact_tech_label: artefactTechLabel,
        model_source: modelSource
      }
    )

    const historySource = rows[0]?.history_source
    if (!isHistoryReadSource(historySource)) {
      throw new Error(
        `History source not configured for ${artefactTechLabel} (${modelSource})`
      )
    }

    return historySource
  }
}
