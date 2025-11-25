import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { ModelsService } from 'src/modules/models/models.service'
import { ExcelService } from 'src/excel/excel.service'
import { MetricsAggregator } from 'src/modules/metrics/aggregators'

import {
  Model,
  Artefact,
  ArtefactTypeEnum,
  ArtefactTypeId
} from 'src/modules/models/interfaces'

import { MetricsEnum } from 'src/modules/metrics/enums'
import { getDefaultModelRiskForReport } from 'src/modules/models/utils/model-risk.utils'
import { isValidDate } from 'src/system/common/utils'

type FilterModel = {
  [key: string]: SetFilter | DateFilter
}

type SetFilter = {
  values: (string | null)[]
  filterType: string
}

type DateFilter = {
  dateFrom: string
  dateTo: string
  filterType: string
  type: string
}

type Preset = {
  key: string
  title: string
  type: string
}

@Injectable()
export class ReportService {
  constructor(
    private readonly sumDatabaseService: SumDatabaseService,
    private readonly mrmDatabaseService: MrmDatabaseService,
    private readonly modelsService: ModelsService,
    private readonly metricsAggregator: MetricsAggregator,
    private readonly excelService: ExcelService
  ) {}

  async exportMetricToExcel(
    metric: MetricsEnum,
    startDate: string | null,
    endDate: string | null,
    streams: string[],
    useDatamart: boolean,
    dataType?: string
  ): Promise<Buffer> {
    const rawData = await this.metricsAggregator.getRawData(
      metric,
      startDate,
      endDate,
      streams,
      useDatamart,
      dataType
    )

    // Для delta данных пустой результат - это нормально
    if (!rawData || rawData.length === 0) {
      if (dataType === 'delta') {
        // Для delta возвращаем пустой Excel файл с динамическими заголовками
        // Получаем заголовки из первой строки данных или используем базовые
        const headers =
          rawData && rawData.length > 0
            ? Object.keys(rawData[0]).map((key) => ({
                key,
                title: key,
                type:
                  typeof rawData[0][key] === 'number'
                    ? 'number'
                    : ('string' as any)
              }))
            : [
                {
                  key: 'system_model_id',
                  title: 'system_model_id',
                  type: 'string'
                },
                { key: 'ds_stream', title: 'ds_stream', type: 'string' },
                { key: 'period', title: 'period', type: 'string' }
              ]

        return this.excelService.createExcel({
          headers,
          body: []
        })
      } else {
        throw new NotFoundException('Нет данных для экспорта')
      }
    }

    const headers = Object.keys(rawData[0]).map((key) => ({
      key,
      title: key,
      type: typeof rawData[0][key] === 'number' ? 'number' : ('string' as any)
    }))

    return this.excelService.createExcel({ headers, body: rawData })
  }

  async getReport(
    filters: FilterModel | { [key: string]: string[] },
    groups?: [],
    mode?: string[],
    reportDate?: string
  ): Promise<Buffer> {
    const legacyFilters = this.convertFiltersToLegacyFormat(filters)
    const reportData: { headers: Preset[]; body: Model[] } =
      await this.generateReportData(legacyFilters, groups, mode, reportDate)
    const xlsxBuffer: Buffer = await this.generateExcel(reportData)

    return xlsxBuffer
  }

  private async generateReportData(
    filters: { [key: string]: string[] },
    groups?: [],
    mode?: string[],
    reportDate?: string
  ): Promise<{ headers: Preset[]; body: Model[] }> {
    if (!Object.keys(filters).length) {
      throw new BadRequestException(
        'Bad Request',
        'filter object cannot be empty'
      )
    }

    const artefacts: Artefact[] = await this.modelsService.getArtefactLabels()

    const headers = this.generateReportHeaders(artefacts)
    const sortedHeaders = this.sortHeadersByFilters(headers, filters)

    const models: Model[] = await this.modelsService.getModels({ mode }, groups)
    const filteredModels = this.filterModels(models, artefacts, filters)

    // Проверяем, является ли это отчётом "Расчёт модельного риска"
    const isModelRiskReport = mode?.includes('model_risk_calculation')

    if (isModelRiskReport) {
      // Только автозаполнение КМР по умолчанию (100%), без расчётов устаревания и сегмента
      filteredModels.forEach((model) => {
        const kmr = getDefaultModelRiskForReport(model.model_risk_coefficient)
        model.model_risk_coefficient = String(kmr)
      })
    }

    return {
      headers: sortedHeaders,
      body: filteredModels
    }
  }

  private filterModels(
    models: Model[],
    artefacts: Artefact[],
    filters: { [key: string]: string[] }
  ): any[] {
    const artefactsMap = this.mapArtefactsByKey(artefacts)

    return models.filter((model) => {
      return Object.keys(filters).every((filterKey) => {
        const filterValues = filters[filterKey]
        const artefactValue = model[filterKey]
        const artefact = artefactsMap[filterKey]

        if (!filterValues || filterValues.length === 0) {
          return true
        }

        if (!artefact) {
          return false
        }

        return this.applyFilter(
          artefactValue,
          filterValues,
          artefact.artefact_type_id
        )
      })
    })
  }

  private applyFilter(
    artefactValue,
    filterValues,
    artefactType: ArtefactTypeId
  ): boolean {
    const hasNullInFilter = filterValues.includes(null)
    const isValueEmpty = ReportService.filterByEmpty(artefactValue)

    if (!hasNullInFilter && isValueEmpty) {
      return false
    }

    if (hasNullInFilter && isValueEmpty) {
      return true
    }

    switch (artefactType) {
      case ArtefactTypeEnum.DATE:
      case ArtefactTypeEnum.QUARTERLY_DATE:
        return ReportService.filterByDate(artefactValue, filterValues)
      case ArtefactTypeEnum.BOOLEAN:
        return ReportService.filterByBoolean(artefactValue, filterValues)
      case ArtefactTypeEnum.TEXT:
      case ArtefactTypeEnum.DROPDOWN:
      case ArtefactTypeEnum.MULTI_DROPDOWN:
      case ArtefactTypeEnum.QUARTERLY_DROPDOWN:
      case ArtefactTypeEnum.PERCENTAGE:
        return ReportService.filterByString(artefactValue, filterValues)
      default:
        return false
    }
  }

  private static filterByDate(artefactValue, filterValues): boolean {
    if (!filterValues || filterValues.length !== 2) {
      return false
    }

    if (
      !isValidDate(artefactValue) ||
      !isValidDate(filterValues[0]) ||
      !isValidDate(filterValues[1])
    ) {
      return false
    }

    const artefactDate = new Date(artefactValue)
    const startDate = new Date(filterValues[0])
    const endDate = new Date(filterValues[1])

    return artefactDate >= startDate && artefactDate <= endDate
  }

  private static filterByBoolean(artefactValue, filterValues): boolean {
    return filterValues.includes(artefactValue)
  }

  private static filterByString(artefactValue, filterValues): boolean {
    return filterValues.includes(artefactValue)
  }

  private static filterByNotNull(artefactValue): boolean {
    return (
      artefactValue !== null &&
      artefactValue !== undefined &&
      artefactValue !== ''
    )
  }

  private static filterByEmpty(artefactValue): boolean {
    return (
      artefactValue === null ||
      artefactValue === undefined ||
      artefactValue === ''
    )
  }

  private mapArtefactsByKey(artefacts: Artefact[]): {
    [key: string]: Artefact
  } {
    return artefacts.reduce((acc, artefact) => {
      acc[artefact.artefact_tech_label] = artefact
      return acc
    }, {})
  }

  async generateExcel(data): Promise<Buffer> {
    return this.excelService.createExcel(data)
  }

  private sortHeadersByFilters(headers, filters) {
    return Object.keys(filters)
      .map((filterKey) => headers.find((header) => header.key === filterKey))
      .filter(Boolean)
  }

  private convertFiltersToLegacyFormat(
    filters: FilterModel | { [key: string]: string[] }
  ): { [key: string]: string[] } {
    if (this.isLegacyFormat(filters)) {
      return filters as { [key: string]: string[] }
    }

    const filterModel = filters as FilterModel
    const legacyFilters: { [key: string]: string[] } = {}

    Object.keys(filterModel).forEach((key) => {
      const filter = filterModel[key]

      if (filter.filterType === 'set') {
        const setFilter = filter as SetFilter
        legacyFilters[key] = setFilter.values.map((v) =>
          v === null ? null : String(v)
        )
      } else if (filter.filterType === 'date') {
        const dateFilter = filter as DateFilter
        legacyFilters[key] = [dateFilter.dateFrom, dateFilter.dateTo]
      }
    })

    return legacyFilters
  }

  private isLegacyFormat(
    filters: FilterModel | { [key: string]: string[] }
  ): boolean {
    const firstKey = Object.keys(filters)[0]
    if (!firstKey) return true

    const firstValue = filters[firstKey]
    return Array.isArray(firstValue)
  }

  private generateReportHeaders(artefacts: Artefact[]): Preset[] {
    const artefactHeaders = artefacts.map(
      ({ artefact_tech_label, artefact_label, artefact_type_desc }) => ({
        key: artefact_tech_label,
        title: artefact_label,
        type: artefact_type_desc
      })
    )

    return artefactHeaders
  }
}
