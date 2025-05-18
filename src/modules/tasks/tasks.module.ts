import { Module } from '@nestjs/common';
import { CamundaModule } from 'src/system/camunda/camunda.module';
import { BpmnModule } from 'src/modules/bpmn/bpmn.module';
import { ArtefactModule } from 'src/modules/artefacts/artefact.module';
import { AssignmentModule } from 'src/modules/assignments/assignment.module';
import { UsersTasksService } from './services';

@Module({
  imports: [CamundaModule, BpmnModule, AssignmentModule, ArtefactModule],
  providers: [UsersTasksService],
  exports: [UsersTasksService],
})
export class TasksModule {}