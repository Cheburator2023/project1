import { Module } from '@nestjs/common'
import { MrmDatabaseService } from './database.service'

@Module({
  providers: [MrmDatabaseService],
  exports: [MrmDatabaseService]
})
export class MrmDatabaseModule {}
