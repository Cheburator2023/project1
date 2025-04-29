import { IndependentMetricType, DependentMetricType } from '../types/'
import { DataAggregator } from './data-aggregator.service'
import { Inject } from '@nestjs/common'
import { MetricsEnum } from '../enums'
import { MODEL_DISPLAY_MODES } from 'src/system/common/constants'

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
    const data = await this.dataAggregator.aggregateData(streams, [MODEL_DISPLAY_MODES.ARCHIVE, MODEL_DISPLAY_MODES.PENDING_DELETE]);

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
    streams: string[]
  ): Promise<{ system_model_id: string }[]> {
    const data = await this.dataAggregator.aggregateData(streams, [MODEL_DISPLAY_MODES.ARCHIVE, MODEL_DISPLAY_MODES.PENDING_DELETE]);
  
    const results: Record<string, any> = {};
  
    for (const metric of this.independentMetrics) {
      metric.initialize(data, startDate, endDate);
      results[metric.getMetricName()] = metric.calculate();
    }
  
    for (const metric of this.dependentMetrics) {
      const dependencies = { ...results };
      metric.initialize(data, startDate, endDate, dependencies);
      results[metric.getMetricName()] = metric.calculate();
    }
  
    const allMetrics = [...this.independentMetrics, ...this.dependentMetrics];
    const foundMetric = allMetrics.find(metric => metric.getMetricName() === metricName);
  
    if (foundMetric && typeof (foundMetric as any).getFilteredRowData === 'function') {
      return (foundMetric as any).getFilteredRowData();
    }
  
    return [];
  }  
}
