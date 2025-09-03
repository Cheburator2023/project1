import { IndependentMetricType, DependentMetricType } from '../types/'
import { DataAggregator } from './data-aggregator.service'
import { Inject } from '@nestjs/common'
import { MetricsEnum } from '../enums'

export class MetricsAggregator {
  constructor(
    private readonly dataAggregator: DataAggregator,
    @Inject('INDEPENDENT_METRICS')
    private readonly independentMetrics: IndependentMetricType[],
    @Inject('DEPENDENT_METRICS')
    private readonly dependentMetrics: DependentMetricType[]
  ) {}

  async getMetrics(
    startDate: string | null,
    endDate: string | null,
    streams: string[],
    useDatamart: boolean
  ): Promise<Record<MetricsEnum, any>> {
    const data = await this.dataAggregator.aggregateData(streams, useDatamart)

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

  async getRawData(
    metricName: MetricsEnum,
    startDate: string | null,
    endDate: string | null,
    streams: string[],
    useDatamart: boolean,
    dataType?: string
  ): Promise<{ system_model_id: string }[]> {
    const data = await this.dataAggregator.aggregateData(streams, useDatamart)

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

    const allMetrics = [...this.independentMetrics, ...this.dependentMetrics]
    const foundMetric = allMetrics.find(
      (metric) => metric.getMetricName() === metricName
    )

    if (foundMetric) {
      if (
        dataType === 'delta' &&
        typeof (foundMetric as any).getFilteredDeltaRowData === 'function'
      ) {
        return (foundMetric as any).getFilteredDeltaRowData()
      }
      if (typeof (foundMetric as any).getFilteredRowData === 'function') {
        return (foundMetric as any).getFilteredRowData()
      }
    }

    return []
  }
}
