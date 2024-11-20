import { BaseMetricResult, IIndependentMetric } from '../interfaces'
import { MetricBase } from './metric.base'

// Класс для независимых метрик
export abstract class IndependentMetric<T extends BaseMetricResult> extends MetricBase<T> implements IIndependentMetric<T> {
  initialize(models: any[], startDate: string | null, endDate: string | null): void {
    this.models = models
    this.startDate = startDate
    this.endDate = endDate
  }
}
