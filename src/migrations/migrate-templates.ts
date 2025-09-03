import { Injectable } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'

import { SumDatabaseService } from '../system/sum-database/database.service'
import { AppModule } from '../app.module'

type LegacyTemplateValue = {
  [key: string]: string[]
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

type FilterModel = {
  [key: string]: SetFilter | DateFilter
}

type NewTemplateValue = {
  filterModel?: FilterModel
  sortState?: Array<{
    colId: string
    sort: 'asc' | 'desc'
    sortIndex: number
  }>
  columnState?: Array<{
    colId: string
    hide?: boolean
  }>
  selectedIds?: string[]
}

@Injectable()
export class TemplateMigrationService {
  constructor(private readonly databaseService: SumDatabaseService) {}

  private async convertLegacyToFilterModel(
    legacyValue: LegacyTemplateValue
  ): Promise<FilterModel> {
    const filterModel: FilterModel = {}

    for (const key of Object.keys(legacyValue)) {
      const values = legacyValue[key]

      if (values.length === 0) {
        continue
      }

      if (this.isDateFilter(values)) {
        filterModel[key] = {
          dateFrom: values[0],
          dateTo: values[1] || values[0],
          filterType: 'date',
          type: 'inRange'
        }
      } else {
        let processedValues = values.filter(
          (v) => v !== 'not-null' && v !== 'empty'
        )

        if (values.includes('not-null')) {
          try {
            const allColumnValues = await this.getAllValuesForColumn(key)
            processedValues = [...processedValues, ...allColumnValues]
          } catch (error) {
            console.error(
              `Ошибка при получении значений для колонки ${key}:`,
              error
            )
          }
        }

        filterModel[key] = {
          values: processedValues.map((v) => (v === '' ? null : v)),
          filterType: 'set'
        }
      }
    }

    return filterModel
  }

  private async getAllValuesForColumn(columnName: string): Promise<string[]> {
    try {
      const result = await this.databaseService.query(
        `SELECT DISTINCT ${columnName} FROM artefact_realizations_new WHERE ${columnName} IS NOT NULL AND ${columnName} != ''`
      )
      return result.map((row) => row[columnName]).filter(Boolean)
    } catch (error) {
      console.error(
        `Ошибка при получении значений для колонки ${columnName}:`,
        error
      )
      return []
    }
  }

  private isDateFilter(values: string[]): boolean {
    if (values.length === 0) return false

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    return values.some((v) => dateRegex.test(v))
  }

  private isLegacyFormat(templateValue: any): boolean {
    if (!templateValue || typeof templateValue !== 'object') {
      return false
    }

    if ('filterModel' in templateValue || 'sortState' in templateValue) {
      return false
    }

    const firstKey = Object.keys(templateValue)[0]
    if (!firstKey) return false

    return Array.isArray(templateValue[firstKey])
  }

  async migrateTemplates(): Promise<void> {
    console.log('Начинаем миграцию шаблонов...')

    console.log(
      '🐸 Pepe said >> TemplateMigrationService >> migrateTemplates >> this.databaseService:',
      this.databaseService
    )

    const templates = await this.databaseService.query(
      'SELECT template_id, template_value FROM templates_new.table WHERE template_value IS NOT NULL'
    )

    console.log(`Найдено ${templates.length} шаблонов для проверки`)

    let migratedCount = 0
    let skippedCount = 0

    for (const template of templates) {
      const { template_id, template_value } = template

      if (!this.isLegacyFormat(template_value)) {
        skippedCount++
        continue
      }

      console.log(`Мигрируем шаблон ID: ${template_id}`)

      const legacyValue = template_value as LegacyTemplateValue
      const filterModel = await this.convertLegacyToFilterModel(legacyValue)

      const newTemplateValue: NewTemplateValue = {
        filterModel,
        sortState: [],
        columnState: [],
        selectedIds: []
      }

      await this.databaseService.query(
        'UPDATE templates_new.table SET template_value = $1 WHERE template_id = $2',
        [JSON.stringify(newTemplateValue), template_id]
      )

      migratedCount++
    }

    console.log(`Миграция завершена:`)
    console.log(`- Мигрировано: ${migratedCount} шаблонов`)
    console.log(`- Пропущено (уже новый формат): ${skippedCount} шаблонов`)
  }

  async rollbackMigration(): Promise<void> {
    console.log('Откат миграции не поддерживается')
    console.log('Создайте резервную копию базы данных перед запуском миграции')
  }
}

async function runMigration() {
  const app = await NestFactory.createApplicationContext(AppModule)
  const databaseService = app.get(SumDatabaseService)
  const migrationService = new TemplateMigrationService(databaseService)

  try {
    await migrationService.migrateTemplates()
    console.log('Миграция успешно завершена')
  } catch (error) {
    console.error('Ошибка при выполнении миграции:', error)
    process.exit(1)
  } finally {
    await app.close()
  }
}

if (require.main === module) {
  runMigration()
}
