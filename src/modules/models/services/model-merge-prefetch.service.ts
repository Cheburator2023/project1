import { Injectable } from '@nestjs/common'
import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { Model } from '../interfaces'
import { getLatestArtefactsForModels as getLatestSumArtefacts } from '../sql/sum'
import { getLatestArtefactsForModels as getLatestSumRmArtefacts } from '../sql/sum-rm'
import {
  TIMESTAMP_PRIORITY_ARTEFACTS,
  SUM_ARTEFACT_ID_MAPPINGS,
  MRM_ARTEFACT_ID_MAPPINGS
} from '../constants'

type ArtefactSnapshot = Record<
  string,
  { artefact_string_value: string | null; effective_from: string | null }
>

@Injectable()
export class ModelMergePrefetchService {
  /**
   * Prefetches latest artefact snapshots for all models on a page, for a configured
   * set of artefacts (timestamp-priority list), and builds fast lookup maps.
   *
   * Why:
   * - Collapse N per-pair DB calls to 2 calls per page (SUM and SUM‑RM)
   * - Keep merge phase pure and O(1) per pair through in-memory lookups
   *
   * Notes:
   * - Honors filterDate to ensure consistent "as-of" snapshots
   * - Queries only configured artefacts via TIMESTAMP_PRIORITY_ARTEFACTS
   * - If page sizes grow very large, consider chunking model_ids
   */
  constructor(
    private readonly sumDatabaseService: SumDatabaseService,
    private readonly mrmDatabaseService: MrmDatabaseService
  ) {}

  async buildMergeMaps(
    sumModels: Model[],
    mrmModels: Model[],
    filterDate: string | null
  ): Promise<{ sumMap: ArtefactSnapshot; mrmMap: ArtefactSnapshot }> {
    const modelIdsSet = new Set<string>(
      [
        ...sumModels.map((m) => m.system_model_id),
        ...mrmModels.map((m) => m.system_model_id)
      ].filter(Boolean) as string[]
    )
    const modelIds = Array.from(modelIdsSet)

    const sumIds = TIMESTAMP_PRIORITY_ARTEFACTS.map(
      (label) => SUM_ARTEFACT_ID_MAPPINGS[label]
    ).filter(Boolean)
    const mrmIds = TIMESTAMP_PRIORITY_ARTEFACTS.map(
      (label) => MRM_ARTEFACT_ID_MAPPINGS[label]
    ).filter(Boolean)

    let sumRows: Array<{
      model_id: string
      artefact_id: number
      artefact_string_value: string | null
      effective_from: string | null
    }> = []
    let mrmRows: Array<{
      model_id: string
      artefact_id: number
      artefact_string_value: string | null
      effective_from: string | null
    }> = []

    if (modelIds.length && (sumIds.length || mrmIds.length)) {
      const [sum, mrm] = await Promise.all([
        sumIds.length
          ? this.sumDatabaseService.query(getLatestSumArtefacts, {
              artefact_ids: sumIds,
              model_ids: modelIds,
              filter_date: filterDate
            })
          : Promise.resolve([]),
        mrmIds.length
          ? this.mrmDatabaseService.query(getLatestSumRmArtefacts, {
              artefact_ids: mrmIds,
              model_ids: modelIds,
              filter_date: filterDate
            })
          : Promise.resolve([])
      ])
      sumRows = sum as typeof sumRows
      mrmRows = mrm as typeof mrmRows
    }

    const sumMap: ArtefactSnapshot = Object.create(null)
    for (const r of sumRows) {
      sumMap[`${r.model_id}:${r.artefact_id}`] = {
        artefact_string_value: r.artefact_string_value,
        effective_from: r.effective_from
      }
    }
    const mrmMap: ArtefactSnapshot = Object.create(null)
    for (const r of mrmRows) {
      mrmMap[`${r.model_id}:${r.artefact_id}`] = {
        artefact_string_value: r.artefact_string_value,
        effective_from: r.effective_from
      }
    }

    return { sumMap, mrmMap }
  }
}
