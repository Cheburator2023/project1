import { Injectable } from '@nestjs/common'
import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { Model } from '../interfaces'
import { TIMESTAMP_PRIORITY_ARTEFACTS, SUM_ARTEFACT_ID_MAPPINGS, MRM_ARTEFACT_ID_MAPPINGS } from '../constants'
import { getArtefactTimestamps as getSumArtefactTimestamps } from '../sql/sum'
import { getArtefactTimestamps as getSumRmArtefactTimestamps } from '../sql/sum-rm'

@Injectable()
export class ModelMergeService {
  constructor(
    private readonly sumDatabaseService: SumDatabaseService,
    private readonly mrmDatabaseService: MrmDatabaseService
  ) {}

  async mergeModels(sumModels: Model[], mrmModels: Model[], filterDate: string | null): Promise<Model[]> {
    const combined = await Promise.all(
      mrmModels.map(async (mrmModel) => {
        const sumMatch = sumModels.find((sumModel) => sumModel['system_model_id'] === mrmModel['system_model_id'])
        if (sumMatch) {
          return await this.mergePair(sumMatch, mrmModel, filterDate)
        }
        return mrmModel
      })
    )

    const uniqueSum = sumModels.filter(
      (sumModel) => !mrmModels.some((mrmModel) => mrmModel['system_model_id'] === sumModel['system_model_id'])
    )

    return [...combined, ...uniqueSum]
  }

  private async mergePair(sumModel: Model, mrmModel: Model, filterDate: string | null): Promise<Model> {
    const merged: Model = { ...mrmModel }

    if (TIMESTAMP_PRIORITY_ARTEFACTS.length > 0) {
      const sumIds = TIMESTAMP_PRIORITY_ARTEFACTS.map((label) => SUM_ARTEFACT_ID_MAPPINGS[label]).filter(Boolean)
      const mrmIds = TIMESTAMP_PRIORITY_ARTEFACTS.map((label) => MRM_ARTEFACT_ID_MAPPINGS[label]).filter(Boolean)

      const [sumArtefactData, mrmArtefactData] = await Promise.all([
        this.sumDatabaseService.query(getSumArtefactTimestamps, {
          artefact_ids: sumIds,
          filter_date: filterDate
        }),
        this.mrmDatabaseService.query(getSumRmArtefactTimestamps, {
          artefact_ids: mrmIds,
          filter_date: filterDate
        })
      ])

      for (const artefactLabel of TIMESTAMP_PRIORITY_ARTEFACTS) {
        const sumId = SUM_ARTEFACT_ID_MAPPINGS[artefactLabel]
        const mrmId = MRM_ARTEFACT_ID_MAPPINGS[artefactLabel]

        const sumArtefact = sumArtefactData.find(
          (a: any) => a.model_id === sumModel.system_model_id && a.artefact_id === sumId
        )
        const mrmArtefact = mrmArtefactData.find(
          (a: any) => a.model_id === mrmModel.system_model_id && a.artefact_id === mrmId
        )

        if (sumArtefact && mrmArtefact) {
          const mergedValue = this.mergeWithTimestampPriority(
            sumArtefact.artefact_string_value,
            mrmArtefact.artefact_string_value,
            sumArtefact.effective_from,
            mrmArtefact.effective_from
          )
          const finalTimestamp = this.getTimestampPriority(
            sumArtefact.effective_from,
            mrmArtefact.effective_from
          )

          merged[artefactLabel] = mergedValue
          if (finalTimestamp) {
            merged[`${artefactLabel}_effective_from`] = finalTimestamp
          }
        } else if (sumArtefact && !mrmArtefact) {
          merged[artefactLabel] = sumArtefact.artefact_string_value
          if (sumArtefact.effective_from) {
            merged[`${artefactLabel}_effective_from`] = sumArtefact.effective_from
          }
        }
      }
    }

    return merged
  }

  private mergeWithTimestampPriority(
    sumValue: any,
    mrmValue: any,
    sumTimestamp?: string,
    mrmTimestamp?: string
  ): any {
    if (sumValue === null || sumValue === undefined) return mrmValue
    if (mrmValue === null || mrmValue === undefined) return sumValue
    if (sumTimestamp && mrmTimestamp) {
      return new Date(sumTimestamp) > new Date(mrmTimestamp) ? sumValue : mrmValue
    }
    return mrmValue
  }

  private getTimestampPriority(sumTimestamp?: string, mrmTimestamp?: string): string | null {
    if (!sumTimestamp && !mrmTimestamp) return null
    if (!sumTimestamp) return mrmTimestamp || null
    if (!mrmTimestamp) return sumTimestamp || null
    return new Date(sumTimestamp) > new Date(mrmTimestamp) ? sumTimestamp : mrmTimestamp
  }
}


