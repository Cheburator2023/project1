import { Module } from '@nestjs/common'
import { ModelsModule } from '../models/models.module'
import { TasksModule } from '../tasks/tasks.module'
import { MrmDatabaseModule } from '../../system/mrm-database/database.module'
import { BiDatamartService } from './bi-datamart.service'
import { BiDatamartSchedulerService } from './bi-datamart-scheduler.service'
import { TasksDatamartService } from './tasks-datamart.service'
import { TasksDatamartSchedulerService } from './tasks-datamart-scheduler.service'
import { BiDatamartSafeWrapperService } from './bi-datamart-safe-wrapper.service'

@Module({
  imports: [ModelsModule, TasksModule, MrmDatabaseModule],
  providers: [
    BiDatamartSafeWrapperService,
    BiDatamartService,
    BiDatamartSchedulerService,
    TasksDatamartService,
    TasksDatamartSchedulerService
  ],
  exports: [
    BiDatamartSafeWrapperService,
    BiDatamartService,
    BiDatamartSchedulerService,
    TasksDatamartService,
    TasksDatamartSchedulerService
  ]
})
export class BiDatamartModule {}
