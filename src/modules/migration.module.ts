import { Module } from '@nestjs/common'
import { MrmDatabaseModule } from 'src/system/mrm-database/database.module'
import { SumDatabaseModule } from 'src/system/sum-database/database.module'

// migrations
import { TemplateMigrationService } from 'src/migrations/migrate-templates'

@Module({
  imports: [MrmDatabaseModule, SumDatabaseModule],
  providers: [TemplateMigrationService],
  exports: [TemplateMigrationService]
})
export class MigrationModule {}
