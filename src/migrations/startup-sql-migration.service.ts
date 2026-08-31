import { Injectable } from '@nestjs/common'
import { createHash } from 'crypto'
import { PoolClient } from 'pg'

import { correctModelStagesAndStatusesSql } from './sql/001_correct_model_stages_and_statuses'
import { setValidationReportApproveDateTypeSql } from './sql/002_set_validation_report_approve_date_type'
import { LoggerService } from 'src/system/logger/logger.service'
import { SumDatabaseService } from 'src/system/sum-database/database.service'

type Migration = {
  id: string
  sql: string
}

type MigrationLedgerRow = {
  checksum_sha256: string
  status: 'started' | 'succeeded' | 'failed'
}

const MIGRATIONS: Migration[] = [
  {
    id: '001_correct_model_stages_and_statuses',
    sql: correctModelStagesAndStatusesSql
  },
  {
    id: '002_set_validation_report_approve_date_type',
    sql: setValidationReportApproveDateTypeSql
  }
]

const ADVISORY_LOCK_NAMESPACE = 1404
const ADVISORY_LOCK_ID = 1

@Injectable()
export class StartupSqlMigrationService {
  constructor(
    private readonly database: SumDatabaseService,
    private readonly logger: LoggerService
  ) {}

  async run(): Promise<void> {
    const migrations = MIGRATIONS.map((migration) => ({
      ...migration,
      checksum: createHash('sha256').update(migration.sql).digest('hex')
    }))

    await this.database.withClient(async (client) => {
      let lockAcquired = false
      const noticeHandler = (
        notice: Error & { code?: string; severity?: string }
      ) => {
        if (notice.severity !== 'WARNING') {
          return
        }

        this.logger.warnMessage(
          'PostgreSQL notice during SUM startup migration',
          'ПредупреждениеМигратораСУМ',
          {
            code: notice.code,
            severity: notice.severity,
            message: notice.message
          }
        )
      }

      client.on('notice', noticeHandler)

      try {
        const lockResult = await client.query(
          'SELECT pg_try_advisory_lock($1, $2) AS lock_acquired',
          [ADVISORY_LOCK_NAMESPACE, ADVISORY_LOCK_ID]
        )
        const lockRow = lockResult.rows[0] as
          | { lock_acquired?: boolean }
          | undefined
        lockAcquired = lockRow?.lock_acquired === true

        if (!lockAcquired) {
          this.logger.warnMessage(
            'SUM startup migration skipped because another instance holds the advisory lock',
            'МиграторСУМУжеЗапущен'
          )
          return
        }

        for (const migration of migrations) {
          await this.runOnce(client, migration)
        }
      } finally {
        if (lockAcquired) {
          try {
            await client.query('SELECT pg_advisory_unlock($1, $2)', [
              ADVISORY_LOCK_NAMESPACE,
              ADVISORY_LOCK_ID
            ])
          } catch (error) {
            this.logger.errorMessage(
              'Unable to release SUM startup migration advisory lock',
              'ОшибкаОсвобожденияБлокировкиМигратораСУМ',
              this.toError(error)
            )
          }
        }

        client.removeListener('notice', noticeHandler)
      }
    })
  }

  private async runOnce(
    client: PoolClient,
    migration: Migration & { sql: string; checksum: string }
  ): Promise<void> {
    const startedAt = Date.now()
    const claimed = await this.claimAttempt(client, migration)

    if (!claimed) {
      return
    }

    this.logger.sys('SUM startup migration attempt registered', {
      migration_id: migration.id,
      checksum_sha256: migration.checksum
    })

    try {
      await client.query('BEGIN')
      await client.query(migration.sql)

      const result = await client.query(
        `
          UPDATE mrms_startup_migrations
             SET status = 'succeeded',
                 finished_at = current_timestamp
           WHERE migration_id = $1
             AND status = 'started'
        `,
        [migration.id]
      )

      if (result.rowCount !== 1) {
        throw new Error(`Migration ledger row was not updated: ${migration.id}`)
      }

      await client.query('COMMIT')

      this.logger.sys('SUM startup migration succeeded', {
        migration_id: migration.id,
        checksum_sha256: migration.checksum,
        duration_ms: Date.now() - startedAt
      })
    } catch (error) {
      await this.rollback(client, migration.id)
      await this.markFailed(client, migration.id)

      const migrationError = this.toError(error)
      this.logger.errorMessage(
        'SUM startup migration failed; application startup will continue',
        'ОшибкаВыполненияМиграцииСУМ',
        migrationError,
        {
          migration_id: migration.id,
          checksum_sha256: migration.checksum,
          sql_state: this.getSqlState(error),
          duration_ms: Date.now() - startedAt
        }
      )
    }
  }

  private async claimAttempt(
    client: PoolClient,
    migration: Migration & { checksum: string }
  ): Promise<boolean> {
    await client.query('BEGIN')

    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS mrms_startup_migrations (
          migration_id varchar(255) PRIMARY KEY,
          checksum_sha256 char(64) NOT NULL,
          status varchar(16) NOT NULL
            CHECK (status IN ('started', 'succeeded', 'failed')),
          started_at timestamptz NOT NULL DEFAULT current_timestamp,
          finished_at timestamptz NULL
        )
      `)

      const inserted = await client.query(
        `
          INSERT INTO mrms_startup_migrations (
            migration_id,
            checksum_sha256,
            status
          )
          VALUES ($1, $2, 'started')
          ON CONFLICT (migration_id) DO NOTHING
          RETURNING migration_id
        `,
        [migration.id, migration.checksum]
      )

      if (inserted.rowCount === 1) {
        await client.query('COMMIT')
        return true
      }

      const existing = await client.query(
        `
          SELECT checksum_sha256, status
            FROM mrms_startup_migrations
           WHERE migration_id = $1
        `,
        [migration.id]
      )

      await client.query('COMMIT')

      const row = existing.rows[0] as MigrationLedgerRow | undefined
      if (row && row.checksum_sha256 !== migration.checksum) {
        this.logger.errorMessage(
          'SUM startup migration was modified after its attempt; execution skipped',
          'ИзмененаОбработаннаяМиграцияСУМ',
          null,
          {
            migration_id: migration.id,
            stored_checksum_sha256: row.checksum_sha256,
            current_checksum_sha256: migration.checksum,
            stored_status: row.status
          }
        )
      } else {
        this.logger.sys('SUM startup migration skipped: already processed', {
          migration_id: migration.id,
          checksum_sha256: migration.checksum,
          stored_status: row?.status
        })
      }

      return false
    } catch (error) {
      await this.rollback(client, migration.id)
      throw error
    }
  }

  private async markFailed(client: PoolClient, migrationId: string) {
    try {
      await client.query(
        `
          UPDATE mrms_startup_migrations
             SET status = 'failed',
                 finished_at = current_timestamp
           WHERE migration_id = $1
             AND status = 'started'
        `,
        [migrationId]
      )
    } catch (error) {
      this.logger.errorMessage(
        'Unable to mark SUM startup migration as failed',
        'ОшибкаОбновленияЖурналаМигратораСУМ',
        this.toError(error),
        { migration_id: migrationId }
      )
    }
  }

  private async rollback(client: PoolClient, migrationId: string) {
    try {
      await client.query('ROLLBACK')
    } catch (error) {
      this.logger.errorMessage(
        'Unable to rollback SUM startup migration transaction',
        'ОшибкаОткатаМиграцииСУМ',
        this.toError(error),
        { migration_id: migrationId }
      )
    }
  }

  private toError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error))
  }

  private getSqlState(error: unknown): string | undefined {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
      return undefined
    }

    return String((error as { code?: unknown }).code || '') || undefined
  }
}
