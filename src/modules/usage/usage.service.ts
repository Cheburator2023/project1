import { Injectable } from '@nestjs/common'
import { UsageServiceFactory } from './factories'
import { UpdateUsageDto } from './dto'
import { canEditQuarter, MODEL_SOURCES } from 'src/system/common'
import { ModelServiceFactory } from 'src/modules/models/factories'

@Injectable()
export class UsageService {
  constructor(
    private readonly usageServiceFactory: UsageServiceFactory,
    private readonly modelsServiceFactory: ModelServiceFactory
  ) {}

  async updateUsage(data, source: MODEL_SOURCES): Promise<boolean> {
    const transformedArtefacts = this.transformArtefacts(data)

    const usageService = this.usageServiceFactory.getService(source)

    const results = await Promise.all(
      transformedArtefacts.map((artefact) =>
        usageService.handleUpdateUsage(artefact)
      )
    )
    const hasUpdates: boolean = results.some((results) => results === true)

    if (hasUpdates) {
      const modelService = this.modelsServiceFactory.getService(source)
      await modelService.updateUpdateDate({
        model_id: transformedArtefacts[0].model_id
      })
    }

    return hasUpdates
  }

  private getCurrentDate(): Date {
    return new Date()
  }

  private determineYear(quarter: number, currentDate: Date): number {
    const currentYear = currentDate.getFullYear()

    // Проверяем переход года
    if (quarter === 4 && canEditQuarter(4, currentYear - 1)) {
      return currentYear - 1
    }

    return currentYear
  }

  private formatDate(date: string): string {
    const [day, month, year] = date.split('.')
    return `${year}-${month}-${day}`
  }

  transformArtefacts(
    artefacts: {
      model_id: string
      artefact_tech_label: string
      artefact_string_value: string
      artefact_value_id: null
      creator: string
    }[]
  ) {
    const currentDate = this.getCurrentDate()
    const result: Record<string, UpdateUsageDto> = {}

    artefacts.forEach(
      ({ model_id, artefact_tech_label, artefact_string_value, creator }) => {
        const match = artefact_tech_label.match(
          /usage_confirm_(date|flag)_q(\d)/
        )
        if (!match) return

        const [, type, quarterStr] = match
        const confirmation_quarter = parseInt(quarterStr, 10)
        const confirmation_year = this.determineYear(
          confirmation_quarter,
          currentDate
        )
        const key = `${confirmation_year}-Q${confirmation_quarter}`

        if (!result[key]) {
          result[key] = {
            model_id,
            confirmation_year,
            confirmation_quarter,
            confirmation_date: null,
            is_used: null,
            creator
          }
        }

        if (type === 'date') {
          result[key].confirmation_date = this.formatDate(artefact_string_value)
        } else if (type === 'flag') {
          result[key].is_used = artefact_string_value.toLowerCase() === 'да'
        }
      }
    )

    return Object.values(result)
  }
}
