export type MRMUsageEntity = {
  usage_id: number
  model_id: string
  confirmation_date: string
  confirmation_year: number
  confirmation_quarter: number
  is_used: boolean
  create_date: string
  update_date: string
  creator: string | null
}

export type MRMUsageHistEntity = {
  usage_history_id: number
  usage_id: number
  model_id: string
  confirmation_date: string
  is_used: boolean
  change_date: string
  changed_by: string
}

export type SUMUsageEntity = {
  model_id: string
  quarter: number
  artifact_link: string
  confirmation_date: string
  confirmation_year: string
  confirmed: boolean
}

export type SUMUsageHistEntity = {
  model_id: string
  quarter: number
  artifact_link: string
  creator_full_name: string
  effective_from: string
  effective_year: number
  confirmed: boolean
}
