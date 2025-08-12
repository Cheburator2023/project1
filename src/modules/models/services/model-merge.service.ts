import { Injectable } from '@nestjs/common'
import { Model } from '../interfaces'
import { TIMESTAMP_PRIORITY_ARTEFACTS, SUM_ARTEFACT_ID_MAPPINGS, MRM_ARTEFACT_ID_MAPPINGS } from '../constants'

@Injectable()
export class ModelMergeService {
  /**
   * Applies merge rules between SUM and SUM‑RM models.
   *
   * Default: MRM priority
   * Special case: timestamp-priority for configured artefacts (e.g., rfd)
   *
   * Expects pre-fetched maps (sumMap, mrmMap) produced by ModelMergePrefetchService
   * to keep this phase pure and fast (no DB calls, O(1) lookups).
   */
  constructor() {}

  async mergeModels(
    sumModels: Model[],
    mrmModels: Model[],
    filterDate: string | null,
    options?: {
      sumMap?: Record<string, { artefact_string_value: string | null; effective_from: string | null }>
      mrmMap?: Record<string, { artefact_string_value: string | null; effective_from: string | null }>
    }
  ): Promise<Model[]> {
    const combined = await Promise.all(
      mrmModels.map(async (mrmModel) => {
        const sumMatch = sumModels.find((sumModel) => sumModel['system_model_id'] === mrmModel['system_model_id'])
        if (sumMatch) {
          return await this.mergePair(sumMatch, mrmModel, filterDate, options)
        }
        return mrmModel
      })
    )

    const uniqueSum = sumModels.filter(
      (sumModel) => !mrmModels.some((mrmModel) => mrmModel['system_model_id'] === sumModel['system_model_id'])
    )

    return [...combined, ...uniqueSum]
  }

  /**
   * Merges a single SUM/SUM‑RM pair using timestamp-priority for selected artefacts.
   * sumMap/mrmMap lookups: key = `${model_id}:${artefact_id}` → latest snapshot
   */
  private async mergePair(
    sumModel: Model,
    mrmModel: Model,
    filterDate: string | null,
    options?: {
      sumMap?: Record<string, { artefact_string_value: string | null; effective_from: string | null }>
      mrmMap?: Record<string, { artefact_string_value: string | null; effective_from: string | null }>
    }
  ): Promise<Model> {
    const merged: Model = { ...mrmModel }

    if (TIMESTAMP_PRIORITY_ARTEFACTS.length > 0) {
      const sumMap = options?.sumMap || {}
      const mrmMap = options?.mrmMap || {}

      for (const artefactLabel of TIMESTAMP_PRIORITY_ARTEFACTS) {
        const sumId = SUM_ARTEFACT_ID_MAPPINGS[artefactLabel]
        const mrmId = MRM_ARTEFACT_ID_MAPPINGS[artefactLabel]

        const sumKey = `${sumModel.system_model_id}:${sumId}`
        const mrmKey = `${mrmModel.system_model_id}:${mrmId}`

        const sumArtefact = sumMap[sumKey]
        const mrmArtefact = mrmMap[mrmKey]

        if (sumArtefact && mrmArtefact) {
          const mergedValue = this.mergeWithTimestampPriority(
            sumArtefact.artefact_string_value,
            mrmArtefact.artefact_string_value,
            sumArtefact.effective_from || undefined,
            mrmArtefact.effective_from || undefined
          )
          const finalTimestamp = this.getTimestampPriority(
            sumArtefact.effective_from || undefined,
            mrmArtefact.effective_from || undefined
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


