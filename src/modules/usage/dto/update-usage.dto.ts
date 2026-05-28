import { MODEL_SOURCES } from 'src/system/common'

export type UpdateUsageDto = {
  model_id: string
  confirmation_year: number
  confirmation_quarter: number
  confirmation_date: string | null
  is_used: boolean | null
  creator: string
}

export type UpdateUsageOptions = {
  syncLinkedSum?: boolean
}

export type UpdateUsageSourceResult = {
  source: MODEL_SOURCES
  attempted: boolean
  updated: boolean
  error: string | null
}

export type UpdateUsageResult = {
  hasUpdates: boolean
  sources: Record<MODEL_SOURCES, UpdateUsageSourceResult>
}
