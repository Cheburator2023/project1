import { Module } from '@nestjs/common'
import { SumDatabaseModule } from 'src/system/sum-database/database.module'
import { BpmnService } from './bpmn.service'
import { BpmnServiceFactory } from './factories'
import { SumBpmnService } from './services'

@Module({
  imports: [SumDatabaseModule],
  providers: [
    SumBpmnService,
    BpmnServiceFactory,
    BpmnService
  ],
  exports: [BpmnService]
})
export class BpmnModule {
}
