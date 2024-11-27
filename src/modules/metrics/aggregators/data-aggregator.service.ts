import { Injectable } from '@nestjs/common'
import { ModelsService } from 'src/modules/models/models.service'
import { AssignmentService } from 'src/modules/assignments/assignment.service'

@Injectable()
export class DataAggregator {
  constructor(
    private readonly modelsService: ModelsService,
    private readonly assignmentService: AssignmentService,
  ) {
  }

  async aggregateData(streams): Promise<any> {
    const models = await this.modelsService.getModels()
    const assignments = await this.assignmentService.getAssigneeHist()

    const filteredModels = models.filter((model) => DataAggregator.filterByStreams(streams, model.ds_stream))
    const filteredAssignees = assignments.filter((assignee) => DataAggregator.filterByStreams(streams, assignee.ds_stream))

    return {
      models: filteredModels,
      assignments: filteredAssignees
    }
  }

  private static filterByStreams(streams: string[], modelStream: string): boolean {
    return streams.includes(modelStream)
  }
}
