import { Injectable } from '@nestjs/common'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { LoggerService } from 'src/system/logger/logger.service'

@Injectable()
export class ArtefactRealizationsService {
  constructor(
    private readonly db: MrmDatabaseService,
    private readonly logger: LoggerService
  ) {}

  async getByKey({
    model_id,
    artefact_id,
    as_of,
    include_history = false
  }: {
    model_id: string
    artefact_id: string
    as_of?: string
    include_history?: boolean
  }) {
    this.logger.info('Getting artefact by key', 'ПолучениеАртефакта', {
      model_id,
      artefact_id,
      as_of,
      include_history
    })

    try {
      if (include_history) {
        // Return all historical records when include_history=true
        const rows = await this.db.query(
          `
              SELECT r.model_id,
                     r.artefact_id::varchar,
                      r.artefact_value_id::varchar,
                      r.artefact_string_value,
                     r.artefact_original_value,
                     r.artefact_custom_type,
                     r.creator,
                     to_char(r.effective_from, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as effective_from,
                     to_char(r.effective_to, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as effective_to,
                     (r.effective_to = to_timestamp('9999-12-31 23:59:59','YYYY-MM-DD HH24:MI:SS')) as is_active
              FROM artefact_realizations_new r
              WHERE r.model_id = :model_id
                AND r.artefact_id = :artefact_id::numeric
              ORDER BY r.effective_from DESC, r.artefact_value_id DESC
          `,
          { model_id, artefact_id }
        )

        this.logger.info(
          'Successfully retrieved artefact history',
          'УспешноеПолучениеИсторииАртефакта',
          {
            model_id,
            artefact_id,
            history_count: rows?.length || 0
          }
        )

        return {
          history: rows || []
        }
      } else {
        // Default behavior - return only the active record (backward compatibility)
        const rows = await this.db.query(
          `
              SELECT r.model_id,
                     r.artefact_id::varchar,
                      r.artefact_value_id::varchar,
                      r.artefact_string_value,
                     r.artefact_original_value,
                     r.artefact_custom_type,
                     r.creator,
                     to_char(r.effective_from, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as effective_from,
                     to_char(r.effective_to, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as effective_to,
                     (r.effective_to = to_timestamp('9999-12-31 23:59:59','YYYY-MM-DD HH24:MI:SS')) as is_active
              FROM artefact_realizations_new r
              WHERE r.model_id = :model_id
                AND r.artefact_id = :artefact_id::numeric
            AND r.effective_to = to_timestamp('9999-12-31 23:59:59','YYYY-MM-DD HH24:MI:SS')
              ORDER BY r.effective_from DESC, r.artefact_value_id DESC
                  LIMIT 1
          `,
          { model_id, artefact_id }
        )

        const result = rows?.[0] || null

        if (result) {
          this.logger.info(
            'Successfully retrieved active artefact',
            'УспешноеПолучениеАктивногоАртефакта',
            {
              model_id,
              artefact_id
            }
          )
        } else {
          this.logger.warn(
            'No active artefact found',
            'АктивныйАртефактНеНайден',
            {
              model_id,
              artefact_id
            }
          )
        }

        return result
      }
    } catch (error) {
      this.logger.error(
        'Error retrieving artefact',
        'ОшибкаПолученияАртефакта',
        error,
        {
          model_id,
          artefact_id,
          include_history
        }
      )
      // For history requests, return empty history array instead of throwing
      if (include_history) {
        return {
          history: []
        }
      }

      throw error
    }
  }

  async query({
    model_ids,
    artefact_ids,
    as_of,
    limit,
    cursor,
    include_not_found
  }: {
    model_ids: string[]
    artefact_ids: string[]
    as_of?: string
    limit?: number
    cursor?: string | null
    include_not_found?: boolean
  }) {
    this.logger.info('Querying artefacts', 'ЗапросАртефактов', {
      model_ids_count: model_ids.length,
      artefact_ids_count: artefact_ids.length,
      as_of,
      limit,
      include_not_found
    })

    try {
      const pageSize = Math.min(Math.max(Number(limit) || 1000, 1), 5000)
      const offset = 0

      const items = await this.db.query(
        `
        WITH requested(model_id, artefact_id) AS (
          SELECT * FROM UNNEST(:model_ids::varchar[], :artefact_ids::numeric[])
        ),
        ranked AS (
          SELECT r.*,
                 ROW_NUMBER() OVER (
                    PARTITION BY r.model_id, r.artefact_id
                    ORDER BY r.effective_from DESC, r.artefact_value_id DESC
                 ) AS rn
          FROM artefact_realizations_new r
          JOIN requested q
            ON r.model_id = q.model_id
           AND r.artefact_id = q.artefact_id
          WHERE r.effective_to = to_timestamp('9999-12-31 23:59:59','YYYY-MM-DD HH24:MI:SS')
        )
        SELECT model_id,
               artefact_id::varchar,
               artefact_value_id::varchar,
               artefact_string_value,
               artefact_original_value,
               artefact_custom_type,
               creator,
               to_char(effective_from, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as effective_from,
               to_char(effective_to, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as effective_to
        FROM ranked
        WHERE rn = 1
        ORDER BY model_id, artefact_id
        LIMIT :limit OFFSET :offset
        `,
        { model_ids, artefact_ids, limit: pageSize, offset }
      )

      let not_found:
        | Array<{ model_id: string; artefact_id: string }>
        | undefined
      if (include_not_found) {
        const foundKeys = new Set(
          items.map((it: any) => `${it.model_id}:${it.artefact_id}`)
        )
        not_found = []
        for (const m of model_ids) {
          for (const a of artefact_ids) {
            const key = `${m}:${a}`
            if (!foundKeys.has(key))
              not_found.push({ model_id: m, artefact_id: a })
          }
        }
      }

      this.logger.info(
        'Query completed successfully',
        'УспешноеВыполнениеЗапросаАртефактов',
        {
          items_count: items.length,
          not_found_count: not_found?.length || 0
        }
      )

      return { items, not_found: not_found || [], next_cursor: null }
    } catch (error) {
      this.logger.error(
        'Error querying artefacts',
        'ОшибкаЗапросаАртефактов',
        error,
        {
          model_ids_count: model_ids.length,
          artefact_ids_count: artefact_ids.length
        }
      )
      throw error
    }
  }
}
