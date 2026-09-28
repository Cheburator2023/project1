import { Module } from '@nestjs/common'
import { MrmDatabaseModule } from 'src/system/mrm-database/database.module'
import { SumDatabaseModule } from 'src/system/sum-database/database.module'

// migrations
import { TemplateMigrationService } from 'src/migrations/migrate-templates'
import { StartupSqlMigrationService } from 'src/migrations/startup-sql-migration.service'

@Module({
  imports: [MrmDatabaseModule, SumDatabaseModule],
  providers: [TemplateMigrationService, StartupSqlMigrationService],
  exports: [TemplateMigrationService, StartupSqlMigrationService]
})
export class MigrationModule {}
