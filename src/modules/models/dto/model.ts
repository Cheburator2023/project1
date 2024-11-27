interface ModelsDto {
  model_id?: string;
  date?: string | null;
}

interface CompareModelsDto {
  firstDate: string;
  secondDate: string;
}

interface ModelWithRelationsDto {
  model_id: string;
}

export { ModelsDto, CompareModelsDto, ModelWithRelationsDto }
