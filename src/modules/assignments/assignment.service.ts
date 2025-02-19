import { Injectable } from '@nestjs/common';
import { MODEL_SOURCES } from 'src/system/common';
import { AssignmentServiceFactory } from './factories';
import { AssignmentsWithRolesEntity } from './entities';

@Injectable()
export class AssignmentService {
  constructor(private readonly assignmentServiceFactory: AssignmentServiceFactory) {}

async getAssignmentsWithRolesByModelId(
  modelIds?: string[],
  daysOfDelay?: number
): Promise<AssignmentsWithRolesEntity[]> {
  const assignmentService = this.assignmentServiceFactory.getService(MODEL_SOURCES.SUM);
  return await assignmentService.getAssignmentsWithRolesByModelId(modelIds, daysOfDelay);
}
}