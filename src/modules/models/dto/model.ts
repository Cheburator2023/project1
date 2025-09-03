interface ModelsDto {
  model_id?: string
  date?: string | null
  mode?: string[]
}

interface CompareModelsDto {
  firstDate: string
  secondDate: string
  mode?: string[]
}

interface ModelWithRelationsDto {
  model_id: string
}

export { ModelsDto, CompareModelsDto, ModelWithRelationsDto }
