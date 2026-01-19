import { Injectable } from '@nestjs/common'
import { ReportGenerationError } from 'src/common/errors'
import { ReportValidationService } from './report-validation.service'
import { ReportCacheService } from './report-cache.service'
import { LoggerService } from '../../system/logger/logger.service'
import { ReportDataService } from './report-data.service'
import { ReportDataDto } from './dto/report-data.dto'

@Injectable()
export class JsonReportService {
  constructor(
    private readonly reportDataService: ReportDataService,
    private readonly validationService: ReportValidationService,
    private readonly cacheService: ReportCacheService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Форматирует детали запроса для логирования
   */
  private formatRequestDetails(
    template_id?: number,
    date?: string,
    groups?: string[],
    mode?: string[],
    filters?: any
  ): string {
    const templateInfo = template_id !== undefined && template_id !== null
      ? `шаблон: ${template_id}`
      : 'без шаблона'

    const dateInfo = date
      ? `дата: ${date}`
      : 'дата не передана'

    const modeInfo = mode && mode.length > 0
      ? `режим обслуживания: [${mode.join(', ')}]`
      : 'режим обслуживания не задан'

    const filtersInfo = filters && Object.keys(filters).length > 0
      ? `фильтры: ${JSON.stringify(filters)}`
      : 'фильтры не заданы'

    const groupsInfo = groups && groups.length > 0
      ? `группы пользователя: [${groups.join(', ')}]`
      : 'группы пользователя не заданы'

    return `Детали запроса: ${templateInfo}, ${dateInfo}, ${modeInfo}, ${filtersInfo}, ${groupsInfo}`
  }

  async getJsonReport(
    template_id?: number,
    date?: string,
    groups?: string[],
    mode?: string[],
    filters?: any
  ): Promise<{ [key: string]: any[] }> {
    const requestDetails = this.formatRequestDetails(template_id, date, groups, mode, filters)

    // Валидация входных параметров
    this.validationService.validateJsonReportRequest(template_id, date, groups)

    // Формируем дату отчета
    let reportDate: Date
    if (date) {
      reportDate = this.validationService.validateDate(date)!
    } else {
      reportDate = new Date()
    }

    // Всегда используем дату из запроса или null
    const formattedDate = date || reportDate.toISOString().split('T')[0]

    const reportMode = mode || []

    // Используем переданные фильтры или пустой объект
    const reportFilters = filters || {}

    // Генерируем ключ кэша с учетом всех параметров
    const cacheKey = this.cacheService.generateJsonReportCacheKey(
      template_id,
      formattedDate, // Используем дату из запроса
      groups,
      reportMode,
      reportFilters
    )

    const cachedResult = await this.cacheService.get(cacheKey)
    if (cachedResult) {
      this.logger.info(`Используется кэшированный результат JSON отчета. ${requestDetails}`)
      return cachedResult as { [key: string]: any[] }
    }

    try {
      const reportDataDto = new ReportDataDto({
        date: formattedDate, // Используем дату из запроса
        groups: groups,
        mode: reportMode,
        reportDate: formattedDate, // Используем дату из запроса
        template_id: template_id,
        filters: reportFilters
      })

      // Получаем модели с учетом фильтрации по режиму эксплуатации
      const models = await this.reportDataService.getReportModels(reportDataDto)

      // Форматируем результат в соответствии с template_id
      const formattedModels = this.reportDataService.formatModelsForTemplate(models, template_id)

      // Всегда используем дату из запроса в ключе ответа
      const resultKey = date ? `reports_${date}` : `reports_${formattedDate}`
      const result = {
        [resultKey]: formattedModels
      }

      // Проверка, что результат не пустой
      if (!result || !result[resultKey]) {
        this.logger.warn(`Отчет не содержит данных. ${requestDetails}`, { template_id, date: formattedDate })
        // Возвращаем пустой отчет вместо ошибки
        result[resultKey] = []
      }

      // Сохраняем в кэш
      await this.cacheService.set(cacheKey, result, 300000)

      this.logger.info(`JSON отчет успешно сформирован и закэширован. ${requestDetails}`)
      return result
    } catch (error) {
      this.logger.error(`Ошибка при формировании JSON отчета: ${error.message}. ${requestDetails}`, error.stack)
      throw new ReportGenerationError('Ошибка при формировании отчета')
    }
  }
}
