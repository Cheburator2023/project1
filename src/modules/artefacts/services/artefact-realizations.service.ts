import { Injectable, Logger } from '@nestjs/common'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'

@Injectable()
export class ArtefactRealizationsService {
  private readonly logger = new Logger(ArtefactRealizationsService.name)

  constructor(private readonly db: MrmDatabaseService) {}

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

        // Always return an object with history array, even if empty
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

        return rows?.[0] || null
      }
    } catch (error) {
      this.logger.error(
        `Error in getByKey for model_id: ${model_id}, artefact_id: ${artefact_id}`,
        error
      )

      // For history requests, return empty history array instead of throwing
      if (include_history) {
        return {
          history: []
        }
      }

      // For default requests, re-throw the error
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
    // For active records, we don't need as_of parameter - we always return current active records
    const pageSize = Math.min(Math.max(Number(limit) || 1000, 1), 5000)
    const offset = 0 // cursor decoding omitted for brevity

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

    let not_found: Array<{ model_id: string; artefact_id: string }> | undefined
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

    return { items, not_found: not_found || [], next_cursor: null }
  }
}
