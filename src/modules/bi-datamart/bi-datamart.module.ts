import { Module } from '@nestjs/common'
import { ModelsModule } from '../models/models.module'
import { MrmDatabaseModule } from '../../system/mrm-database/database.module'
import { BiDatamartService } from './bi-datamart.service'
import { BiDatamartSchedulerService } from './bi-datamart-scheduler.service'

@Module({
  imports: [
    ModelsModule,
    MrmDatabaseModule,
  ],
  providers: [
    BiDatamartService,
    BiDatamartSchedulerService,
  ],
  exports: [
    BiDatamartService,
    BiDatamartSchedulerService,
  ],
})
export class BiDatamartModule {} 