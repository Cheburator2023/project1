import { Injectable } from '@nestjs/common'
import { ModelsService } from 'src/modules/models/models.service'

@Injectable()
export class ModelFetcherService {
  constructor(private readonly modelsService: ModelsService) {}

  async fetchModels(
    date?: string,
    groups?: string[],
    mode: string[] = [],
    ignoreModeFilter: boolean = false
  ): Promise<any[]> {
    return await this.modelsService.getModels(
      {
        date: date || null,
        mode: mode,
        ignoreModeFilter: ignoreModeFilter
      },
      groups || []
    )
  }

  async fetchModelsWithTemplateFilter(
    template_id: number,
    date?: string,
    groups?: string[],
    mode: string[] = []
  ): Promise<any[]> {
    const models = await this.fetchModels(date, groups, mode, false)

    const filteredModels = this.applyTemplateFilterInReportFormat(models, template_id)

    return filteredModels
  }

  private applyTemplateFilterInReportFormat(models: any[], template_id: number): any[] {
    switch (template_id) {
      case 1: // ПУРС
              // Фильтр: record_id IS NOT NULL
        return models.filter(model =>
          model.record_id !== null &&
          model.record_id !== undefined &&
          model.record_id !== ''
        )
      case 2: // ПУМР
              // Фильтр: active_model = '1'
        return models.filter(model => model.active_model === '1')
      default:
        return models
    }
  }
}