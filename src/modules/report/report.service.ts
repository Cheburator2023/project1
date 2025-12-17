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
import { ReportDataService } from './report-data.service'
import { ReportDataDto } from './dto/report-data.dto'
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
    private readonly excelService: ExcelService,
    private readonly reportDataService: ReportDataService
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

  /**
   * Основной метод получения отчета в формате Excel
   */
  async getReport(
    filters: FilterModel | { [key: string]: string[] },
    groups?: [],
    mode?: string[],
    reportDate?: string
  ): Promise<Buffer> {
    // Преобразуем фильтры в legacy формат
    const legacyFilters = this.convertFiltersToLegacyFormat(filters)

    // Для Excel отчета также используем mode:[] если не задан явно
    const reportMode = mode || []

    // Если reportDate не указан, используем текущую дату
    const effectiveReportDate = reportDate || new Date().toISOString().split('T')[0]

    // Генерируем данные отчета через унифицированный метод
    const reportData: { headers: Preset[]; body: Model[] } =
      await this.generateReportData(legacyFilters, groups, reportMode, effectiveReportDate)

    // Генерируем Excel файл
    const xlsxBuffer: Buffer = await this.generateExcel(reportData)

    return xlsxBuffer
  }

  /**
   * Генерация данных отчета
   */
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

    // Получаем артефакты для заголовков
    const artefacts: Artefact[] = await this.modelsService.getArtefactLabels()
    const headers = this.generateReportHeaders(artefacts)
    const sortedHeaders = this.sortHeadersByFilters(headers, filters)

    // Используем унифицированный метод получения моделей
    const models = await this.reportDataService.getUnifiedReportModels(
      undefined, // template_id не указан для Excel отчета
      reportDate,
      groups,
      mode || [],
      filters
    )

    return {
      headers: sortedHeaders,
      body: models
    }
  }


  /**
   * Фильтрация моделей по артефактам
   */
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

  /**
   * Применение фильтра к значению артефакта
   */
  private applyFilter(
    artefactValue: any,
    filterValues: string[],
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

  /**
   * Статические методы фильтрации
   */
  private static filterByDate(artefactValue: string, filterValues: string[]): boolean {
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

  private static filterByBoolean(artefactValue: string, filterValues: string[]): boolean {
    return filterValues.includes(artefactValue)
  }

  private static filterByString(artefactValue: string, filterValues: string[]): boolean {
    return filterValues.includes(artefactValue)
  }

  private static filterByNotNull(artefactValue: any): boolean {
    return (
      artefactValue !== null &&
      artefactValue !== undefined &&
      artefactValue !== ''
    )
  }

  private static filterByEmpty(artefactValue: any): boolean {
    return (
      artefactValue === null ||
      artefactValue === undefined ||
      artefactValue === ''
    )
  }

  /**
   * Создание карты артефактов по ключу
   */
  private mapArtefactsByKey(artefacts: Artefact[]): {
    [key: string]: Artefact
  } {
    return artefacts.reduce((acc, artefact) => {
      acc[artefact.artefact_tech_label] = artefact
      return acc
    }, {})
  }

  /**
   * Генерация Excel файла
   */
  async generateExcel(data: any): Promise<Buffer> {
    return this.excelService.createExcel(data)
  }

  /**
   * Сортировка заголовков по фильтрам
   */
  private sortHeadersByFilters(headers: Preset[], filters: { [key: string]: string[] }) {
    return Object.keys(filters)
      .map((filterKey) => headers.find((header) => header.key === filterKey))
      .filter(Boolean)
  }

  /**
   * Преобразование фильтров в legacy формат
   */
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

  /**
   * Проверка формата фильтров
   */
  private isLegacyFormat(
    filters: FilterModel | { [key: string]: string[] }
  ): boolean {
    const firstKey = Object.keys(filters)[0]
    if (!firstKey) return true

    const firstValue = filters[firstKey]
    return Array.isArray(firstValue)
  }

  /**
   * Генерация заголовков отчета
   */
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

  /**
   * Получение моделей для отчета
   */
  private async getReportModels(
    filters: { [key: string]: string[] },
    groups?: [],
    mode?: string[],
    reportDate?: string
  ): Promise<Model[]> {
    const reportDataDto = new ReportDataDto({
      groups: groups,
      mode: mode || [],
      reportDate: reportDate,
      filters: filters
    })

    // Получаем модели
    const models = await this.reportDataService.getReportModels(reportDataDto)

    return models
  }

  /**
   * Публичный метод для получения моделей через единый сервис
   */
  async getReportModelsUnified(
    filters: { [key: string]: string[] },
    groups?: [],
    mode?: string[],
    reportDate?: string
  ): Promise<Model[]> {
    const effectiveReportDate = reportDate || new Date().toISOString().split('T')[0]

    const reportDataDto = new ReportDataDto({
      date: effectiveReportDate, // ← Добавляем дату
      groups: groups,
      mode: mode || [],
      reportDate: effectiveReportDate,
      filters: filters
    })

    // Получаем базовые модели
    const models = await this.reportDataService.getReportModels(reportDataDto)

    return models
  }
}
