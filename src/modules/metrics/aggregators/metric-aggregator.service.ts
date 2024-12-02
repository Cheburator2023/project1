import { IndependentMetricType, DependentMetricType } from '../types/'
import { DataAggregator } from './data-aggregator.service'
import { Inject } from '@nestjs/common'
import { MetricsEnum } from '../enums'

export class MetricsAggregator {
  constructor(
    private readonly dataAggregator: DataAggregator,
    @Inject('INDEPENDENT_METRICS') private readonly independentMetrics: IndependentMetricType[],
    @Inject('DEPENDENT_METRICS') private readonly dependentMetrics: DependentMetricType[]
  ) {
  }

  async getMetrics(
    startDate: string | null,
    endDate: string | null,
    streams: string[]
  ): Promise<Record<MetricsEnum, any>> {
    // Aggregate data
    const data = await this.dataAggregator.aggregateData(streams)

    const results: Record<string, any> = {}

    for (const metric of this.independentMetrics) {
      metric.initialize(data, startDate, endDate)
      results[metric.getMetricName()] = metric.calculate()
    }

    for (const metric of this.dependentMetrics) {
      const dependencies = { ...results }
      metric.initialize(data, startDate, endDate, dependencies)
      results[metric.getMetricName()] = metric.calculate()
    }

    return results
  }
}
