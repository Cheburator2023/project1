import { Injectable } from '@nestjs/common'
import { MODEL_SOURCES, MODEL_STATUS } from 'src/system/common/constants'

type CatalogModel = {
  model_source?: string | null
  model_status?: string | null
}

@Injectable()
export class ModelVisibilityService {
  isVisibleInCatalog(model: CatalogModel): boolean {
    return !(
      model.model_source === MODEL_SOURCES.SUM &&
      model.model_status === MODEL_STATUS.CREATION_ERROR
    )
  }

  filterCatalogModels<T extends CatalogModel>(models: T[]): T[] {
    return models.filter((model) => this.isVisibleInCatalog(model))
  }
}
