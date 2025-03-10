export type UpdateUsageDto = {
  model_id: string
  confirmation_year: number,
  confirmation_quarter: number,
  confirmation_date: string | null,
  is_used: boolean | null,
  creator: string
}
