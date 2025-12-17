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

  async getJsonReport(
    template_id?: number,
    date?: string,
    groups?: string[],
    mode?: string[],
    filters?: any
  ): Promise<{ [key: string]: any[] }> {
    // Валидация входных параметров
    this.validationService.validateJsonReportRequest(template_id, date, groups)

    // Формируем дату отчета
    let reportDate: Date
    if (date) {
      reportDate = this.validationService.validateDate(date)!
    } else {
      reportDate = new Date()
    }

    const formattedDate = reportDate.toISOString().split('T')[0]

    const reportMode = mode || []

    // Используем переданные фильтры или пустой объект
    const reportFilters = filters || {}

    // Генерируем ключ кэша с учетом всех параметров
    const cacheKey = this.cacheService.generateJsonReportCacheKey(
      template_id,
      formattedDate,
      groups,
      reportMode,
      reportFilters
    )

    const cachedResult = await this.cacheService.get(cacheKey)
    if (cachedResult) {
      this.logger.info('Используется кэшированный результат JSON отчета')
      return cachedResult as { [key: string]: any[] }
    }

    try {
      const reportDataDto = new ReportDataDto({
        date: formattedDate,
        groups: groups,
        mode: reportMode,
        reportDate: formattedDate,
        template_id: template_id,
        filters: reportFilters
      })

      // Получаем модели
      const models = await this.reportDataService.getReportModels(reportDataDto)

      // Применяем фильтры шаблона
      const filteredModels = this.reportDataService.applyTemplateFilter(models, template_id)

      // Форматируем результат в соответствии с template_id
      const formattedModels = this.reportDataService.formatModelsForTemplate(filteredModels, template_id)

      const result = {
        [`reports_${formattedDate}`]: formattedModels
      }

      // Проверка, что результат не пустой
      if (!result || !result[`reports_${formattedDate}`]) {
        this.logger.warn('Отчет не содержит данных', { template_id, date: formattedDate })
        // Возвращаем пустой отчет вместо ошибки
        result[`reports_${formattedDate}`] = []
      }

      // Сохраняем в кэш
      await this.cacheService.set(cacheKey, result, 300000)

      this.logger.info('JSON отчет успешно сформирован и закэширован')
      return result
    } catch (error) {
      this.logger.error(`Ошибка при формировании JSON отчета: ${error.message}`, error.stack)
      throw new ReportGenerationError('Ошибка при формировании отчета')
    }
  }
}
