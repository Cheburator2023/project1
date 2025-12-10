import { Injectable } from '@nestjs/common'
import { ValidationError } from 'src/common/errors'
import { parseDate, isValidDate } from 'src/system/common/utils'

@Injectable()
export class ReportValidationService {
  validateTemplateId(template_id?: number): void {
    if (template_id && ![1, 2].includes(template_id)) {
      throw new ValidationError('Неверно указан template_id/дата')
    }
  }

  validateDate(date?: string): Date | null {
    if (!date) {
      return null
    }

    const parsedDate = parseDate(date)
    if (!parsedDate || !isValidDate(date)) {
      throw new ValidationError('Неверно указан template_id/дата')
    }

    return parsedDate
  }

  validateGroups(groups?: string[]): void {
    if (!groups || groups.length === 0) {
      throw new ValidationError('Отсутствуют группы пользователя')
    }
  }

  validateJsonReportRequest(template_id?: number, date?: string, groups?: string[]): void {
    this.validateTemplateId(template_id)

    if (date) {
      this.validateDate(date)
    }

    if (groups) {
      this.validateGroups(groups)
    }
  }
}