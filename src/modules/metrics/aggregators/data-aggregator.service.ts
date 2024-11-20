import { Injectable } from '@nestjs/common'
import { ModelsService } from 'src/modules/models/models.service'

@Injectable()
export class DataAggregator {
  constructor(
    private readonly modelsService: ModelsService
  ) {
  }

  async aggregateData(streams): Promise<any> {
    const models = await this.modelsService.getModels()
    return models.filter((model) => DataAggregator.filterByStreams(streams, model.ds_stream))
  }

  private static filterByStreams(streams: string[], modelStream: string): boolean {
    return streams.includes(modelStream)
  }
}
