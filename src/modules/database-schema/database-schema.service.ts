import { Injectable, Logger } from '@nestjs/common'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'

@Injectable()
export class DatabaseSchemaService {
  private readonly logger = new Logger(DatabaseSchemaService.name)

  constructor(private readonly databaseService: MrmDatabaseService) {}

  async getFullDatabaseSchema(): Promise<any> {
    try {
      const tablesQuery = `
        SELECT 
          table_name,
          table_schema,
          table_type
        FROM information_schema.tables 
        WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
        ORDER BY table_schema, table_name
      `

      const tables = await this.databaseService.query(tablesQuery)

      const jsonSchema = {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'https://example.com/database-schema.json',
        title: 'Схема базы данных',
        description: 'JSON Schema для полной схемы базы данных',
        type: 'object',
        properties: {},
        additionalProperties: false,
        definitions: {
          столбец: {
            type: 'object',
            properties: {
              тип: {
                type: 'string',
                description: 'Тип данных столбца'
              },
              обязательный: {
                type: 'boolean',
                description: 'Является ли столбец обязательным'
              },
              значение_по_умолчанию: {
                type: ['string', 'null'],
                description: 'Значение по умолчанию'
              },
              максимальная_длина: {
                type: ['integer', 'null'],
                description: 'Максимальная длина для строковых типов'
              },
              числовая_точность: {
                type: ['integer', 'null'],
                description: 'Точность для числовых типов'
              },
              числовой_масштаб: {
                type: ['integer', 'null'],
                description: 'Масштаб для числовых типов'
              }
            },
            required: ['тип', 'обязательный'],
            additionalProperties: false
          },
          ограничение: {
            type: 'object',
            properties: {
              тип: {
                type: 'string',
                enum: ['PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE', 'CHECK'],
                description: 'Тип ограничения'
              },
              столбцы: {
                type: 'array',
                items: { type: 'string' },
                description: 'Столбцы, участвующие в ограничении'
              },
              ссылка_на_таблицу: {
                type: 'string',
                description: 'Таблица для внешнего ключа'
              },
              ссылка_на_столбцы: {
                type: 'array',
                items: { type: 'string' },
                description: 'Столбцы в связанной таблице'
              }
            },
            required: ['тип', 'столбцы'],
            additionalProperties: false
          },
          индекс: {
            type: 'object',
            properties: {
              столбцы: {
                type: 'array',
                items: { type: 'string' },
                description: 'Столбцы в индексе'
              },
              уникальный: {
                type: 'boolean',
                description: 'Является ли индекс уникальным'
              },
              первичный: {
                type: 'boolean',
                description: 'Является ли индекс первичным ключом'
              }
            },
            required: ['столбцы', 'уникальный', 'первичный'],
            additionalProperties: false
          }
        }
      }

      for (const table of tables) {
        const columnsQuery = `
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length,
            numeric_precision,
            numeric_scale,
            ordinal_position
          FROM information_schema.columns 
          WHERE table_schema = :table_schema AND table_name = :table_name
          ORDER BY ordinal_position
        `

        const columns = await this.databaseService.query(columnsQuery, {
          table_schema: table.table_schema,
          table_name: table.table_name
        })

        const constraintsQuery = `
          SELECT 
            tc.constraint_name,
            tc.constraint_type,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints tc
          LEFT JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
          LEFT JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
          WHERE tc.table_schema = :table_schema AND tc.table_name = :table_name
        `

        const constraints = await this.databaseService.query(constraintsQuery, {
          table_schema: table.table_schema,
          table_name: table.table_name
        })

        const indexesQuery = `
          SELECT 
            i.relname AS index_name,
            a.attname AS column_name,
            ix.indisunique AS is_unique,
            ix.indisprimary AS is_primary
          FROM pg_class t
          JOIN pg_index ix ON t.oid = ix.indrelid
          JOIN pg_class i ON i.oid = ix.indexrelid
          JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
          JOIN pg_namespace n ON n.oid = t.relnamespace
          WHERE n.nspname = :table_schema AND t.relname = :table_name
          ORDER BY i.relname, a.attnum
        `

        const indexes = await this.databaseService.query(indexesQuery, {
          table_schema: table.table_schema,
          table_name: table.table_name
        })

        const tableKey = `${table.table_schema}.${table.table_name}`

        const properties = {}
        const required = []

        for (const col of columns) {
          properties[col.column_name] = {
            $ref: '#/definitions/столбец',
            тип: col.data_type,
            обязательный: col.is_nullable !== 'YES',
            значение_по_умолчанию: col.column_default,
            максимальная_длина: col.character_maximum_length,
            числовая_точность: col.numeric_precision,
            числовой_масштаб: col.numeric_scale
          }

          if (col.is_nullable !== 'YES') {
            required.push(col.column_name)
          }
        }

        const constraintsByType = {}
        for (const constraint of constraints) {
          if (!constraintsByType[constraint.constraint_name]) {
            constraintsByType[constraint.constraint_name] = {
              тип: constraint.constraint_type,
              столбцы: [],
              ссылка_на_таблицу: constraint.foreign_table_name,
              ссылка_на_столбцы: constraint.foreign_column_name
                ? [constraint.foreign_column_name]
                : []
            }
          }
          if (constraint.column_name) {
            constraintsByType[constraint.constraint_name].столбцы.push(
              constraint.column_name
            )
          }
        }

        const indexesByName = {}
        for (const index of indexes) {
          if (!indexesByName[index.index_name]) {
            indexesByName[index.index_name] = {
              столбцы: [],
              уникальный: index.is_unique,
              первичный: index.is_primary
            }
          }
          indexesByName[index.index_name].столбцы.push(index.column_name)
        }

        jsonSchema.properties[tableKey] = {
          type: 'object',
          title: `Таблица ${table.table_name}`,
          description: `Схема для таблицы ${table.table_name} в схеме ${table.table_schema}`,
          properties,
          required,
          additionalProperties: false,
          'x-table-info': {
            схема: table.table_schema,
            имя_таблицы: table.table_name,
            тип_таблицы: table.table_type,
            ограничения: Object.values(constraintsByType),
            индексы: Object.values(indexesByName),
            статистика: {
              количество_столбцов: columns.length,
              количество_ограничений: Object.keys(constraintsByType).length,
              количество_индексов: Object.keys(indexesByName).length
            }
          }
        }
      }

      return jsonSchema
    } catch (error) {
      this.logger.error(
        `Ошибка при получении схемы базы данных: ${error.message}`
      )
      throw new Error(`Не удалось получить схему базы данных: ${error.message}`)
    }
  }
}
