import { Injectable } from '@nestjs/common'
import { createHash } from 'crypto'
import { PoolClient } from 'pg'

import { correctModelStagesAndStatusesSql } from './sql/001_correct_model_stages_and_statuses'
import { setValidationReportApproveDateTypeSql } from './sql/002_set_validation_report_approve_date_type'
import { resetStuckModelArchivingSql } from './sql/003_reset_stuck_model_archiving'
import {
  clearReleaseAndEpicArtefactsInMrmSql,
  clearReleaseAndEpicArtefactsInSumSql
} from './sql/004_clear_release_and_epic_artefacts'
import { LoggerService } from 'src/system/logger/logger.service'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { SumDatabaseService } from 'src/system/sum-database/database.service'

type Migration = {
  id: string
  sql: string
}

type MigrationDatabase = {
  withClient<T>(handler: (client: PoolClient) => Promise<T>): Promise<T>
}

type MigrationTarget = 'SUM' | 'SUM-RM'

type MigrationLedgerRow = {
  checksum_sha256: string
  status: 'started' | 'succeeded' | 'failed'
}

const SUM_MIGRATIONS: Migration[] = [
  {
    id: '001_correct_model_stages_and_statuses',
    sql: correctModelStagesAndStatusesSql
  },
  {
    id: '002_set_validation_report_approve_date_type',
    sql: setValidationReportApproveDateTypeSql
  },
  {
    id: '003_reset_stuck_model_archiving',
    sql: resetStuckModelArchivingSql
  },
  {
    id: '004_clear_release_and_epic_artefacts',
    sql: clearReleaseAndEpicArtefactsInSumSql
  }
]

const MRM_MIGRATIONS: Migration[] = [
  {
    id: '004_clear_release_and_epic_artefacts',
    sql: clearReleaseAndEpicArtefactsInMrmSql
  }
]

const ADVISORY_LOCK_NAMESPACE = 1404
const ADVISORY_LOCK_ID = 1

@Injectable()
export class StartupSqlMigrationService {
  constructor(
    private readonly sumDatabase: SumDatabaseService,
    private readonly mrmDatabase: MrmDatabaseService,
    private readonly logger: LoggerService
  ) {}

  async run(): Promise<void> {
    const targets: Array<{
      name: MigrationTarget
      database: MigrationDatabase
      migrations: Migration[]
    }> = [
      {
        name: 'SUM',
        database: this.sumDatabase,
        migrations: SUM_MIGRATIONS
      },
      {
        name: 'SUM-RM',
        database: this.mrmDatabase,
        migrations: MRM_MIGRATIONS
      }
    ]

    for (const target of targets) {
      try {
        await this.runForTarget(
          target.name,
          target.database,
          target.migrations
        )
      } catch (error) {
        this.logger.errorMessage(
          `${target.name} startup migration subsystem failed; application startup will continue`,
          `ОшибкаМигратора${this.targetEventSuffix(target.name)}`,
          this.toError(error),
          { target_database: target.name }
        )
      }
    }
  }

  private async runForTarget(
    target: MigrationTarget,
    database: MigrationDatabase,
    targetMigrations: Migration[]
  ): Promise<void> {
    const migrations = targetMigrations.map((migration) => ({
      ...migration,
      checksum: createHash('sha256').update(migration.sql).digest('hex')
    }))

    await database.withClient(async (client) => {
      let lockAcquired = false
      const noticeHandler = (
        notice: Error & { code?: string; severity?: string }
      ) => {
        if (notice.severity !== 'WARNING') {
          return
        }

        this.logger.warnMessage(
          `PostgreSQL notice during ${target} startup migration`,
          `ПредупреждениеМигратора${this.targetEventSuffix(target)}`,
          {
            code: notice.code,
            severity: notice.severity,
            message: notice.message,
            target_database: target
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
            `${target} startup migration skipped because another instance holds the advisory lock`,
            `Мигратор${this.targetEventSuffix(target)}УжеЗапущен`,
            { target_database: target }
          )
          return
        }

        for (const migration of migrations) {
          await this.runOnce(client, migration, target)
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
              `Unable to release ${target} startup migration advisory lock`,
              `ОшибкаОсвобожденияБлокировкиМигратора${this.targetEventSuffix(target)}`,
              this.toError(error),
              { target_database: target }
            )
          }
        }

        client.removeListener('notice', noticeHandler)
      }
    })
  }

  private async runOnce(
    client: PoolClient,
    migration: Migration & { sql: string; checksum: string },
    target: MigrationTarget
  ): Promise<void> {
    const startedAt = Date.now()
    const claimed = await this.claimAttempt(client, migration, target)

    if (!claimed) {
      return
    }

    this.logger.sys(`${target} startup migration attempt registered`, {
      migration_id: migration.id,
      checksum_sha256: migration.checksum,
      target_database: target
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

      this.logger.sys(`${target} startup migration succeeded`, {
        migration_id: migration.id,
        checksum_sha256: migration.checksum,
        target_database: target,
        duration_ms: Date.now() - startedAt
      })
    } catch (error) {
      await this.rollback(client, migration.id, target)
      await this.markFailed(client, migration.id, target)

      const migrationError = this.toError(error)
      this.logger.errorMessage(
        `${target} startup migration failed; application startup will continue`,
        `ОшибкаВыполненияМиграции${this.targetEventSuffix(target)}`,
        migrationError,
        {
          migration_id: migration.id,
          checksum_sha256: migration.checksum,
          target_database: target,
          sql_state: this.getSqlState(error),
          duration_ms: Date.now() - startedAt
        }
      )
    }
  }

  private async claimAttempt(
    client: PoolClient,
    migration: Migration & { checksum: string },
    target: MigrationTarget
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
          `${target} startup migration was modified after its attempt; execution skipped`,
          `ИзмененаОбработаннаяМиграция${this.targetEventSuffix(target)}`,
          null,
          {
            migration_id: migration.id,
            stored_checksum_sha256: row.checksum_sha256,
            current_checksum_sha256: migration.checksum,
            stored_status: row.status,
            target_database: target
          }
        )
      } else {
        this.logger.sys(`${target} startup migration skipped: already processed`, {
          migration_id: migration.id,
          checksum_sha256: migration.checksum,
          stored_status: row?.status,
          target_database: target
        })
      }

      return false
    } catch (error) {
      await this.rollback(client, migration.id, target)
      throw error
    }
  }

  private async markFailed(
    client: PoolClient,
    migrationId: string,
    target: MigrationTarget
  ) {
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
        `Unable to mark ${target} startup migration as failed`,
        `ОшибкаОбновленияЖурналаМигратора${this.targetEventSuffix(target)}`,
        this.toError(error),
        { migration_id: migrationId, target_database: target }
      )
    }
  }

  private async rollback(
    client: PoolClient,
    migrationId: string,
    target: MigrationTarget
  ) {
    try {
      await client.query('ROLLBACK')
    } catch (error) {
      this.logger.errorMessage(
        `Unable to rollback ${target} startup migration transaction`,
        `ОшибкаОткатаМиграции${this.targetEventSuffix(target)}`,
        this.toError(error),
        { migration_id: migrationId, target_database: target }
      )
    }
  }

  private targetEventSuffix(target: MigrationTarget): string {
    return target === 'SUM' ? 'СУМ' : 'СУМРМ'
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
