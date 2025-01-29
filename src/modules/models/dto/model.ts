interface ModelsDto {
  model_id?: string;
  date?: string | null;
  excludeError?: boolean;
}

interface CompareModelsDto {
  firstDate: string;
  secondDate: string;
  excludeError?: boolean;
}

interface ModelWithRelationsDto {
  model_id: string;
}

export { ModelsDto, CompareModelsDto, ModelWithRelationsDto }
