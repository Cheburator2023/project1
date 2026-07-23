import { Injectable } from '@nestjs/common'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { ModelSource } from 'src/api/dto/index.dto'
import {
  HistoryReadSource,
  isHistoryReadSource
} from '../constants/history-read-source'
import { sql as loadArtefactHistorySourceSql } from '../sql/load-artefact-history-source'
import { sql as loadPartialSyncCutoverSql } from '../sql/load-partial-sync-cutover'
import { sql as insertSyncCutoverSql } from '../sql/insert-sync-cutover'

@Injectable()
export class ArtefactHistorySourceService {
  constructor(private readonly mrmDatabaseService: MrmDatabaseService) {}

  async resolveReadSource(
    artefactTechLabel: string,
    modelSource: ModelSource
  ): Promise<HistoryReadSource | null> {
    const rows = await this.mrmDatabaseService.query(
      loadArtefactHistorySourceSql,
      {
        artefact_tech_label: artefactTechLabel,
        model_source: modelSource
      }
    )

    const historySource = rows[0]?.history_source
    if (!isHistoryReadSource(historySource)) {
      return null
    }

    return historySource
  }

  async getPartialSyncCutoverAt(
    modelId: string,
    artefactTechLabel: string
  ): Promise<string | null> {
    const rows = await this.mrmDatabaseService.query(loadPartialSyncCutoverSql, {
      model_uuid: modelId,
      artefact_tech_label: artefactTechLabel
    })

    return rows[0]?.cutover_at ?? null
  }

  async recordSyncCutoverIfNeeded(
    modelId: string,
    artefactTechLabel: string,
    brokenBy?: string | null
  ): Promise<void> {
    await this.mrmDatabaseService.query(insertSyncCutoverSql, {
      model_id: modelId,
      model_uuid: modelId,
      artefact_tech_label: artefactTechLabel,
      broken_by: brokenBy ?? null
    })
  }
}
