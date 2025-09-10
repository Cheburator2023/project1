import { Module } from '@nestjs/common'
import { DatabaseSchemaController } from './database-schema.controller'
import { DatabaseSchemaService } from './database-schema.service'
import { MrmDatabaseModule } from 'src/system/mrm-database/database.module'

@Module({
  imports: [MrmDatabaseModule],
  controllers: [DatabaseSchemaController],
  providers: [DatabaseSchemaService],
  exports: [DatabaseSchemaService]
})
export class DatabaseSchemaModule {}
