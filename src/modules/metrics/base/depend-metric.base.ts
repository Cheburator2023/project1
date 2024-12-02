import { BaseMetricResult, IDependentMetric, MetricDependencyMap } from '../interfaces'
import { MetricBase } from './metric.base'

// Класс для зависимых метрик
export abstract class DependentMetric<T extends BaseMetricResult, D extends Partial<MetricDependencyMap>> extends MetricBase<T> implements IDependentMetric<T, D> {
  protected dependencies!: { [K in keyof D]: D[K] }

  initialize(
    data: any,
    startDate: string | null,
    endDate: string | null,
    dependencies: { [K in keyof D]: D[K] }
  ): void {
    this.models = data.models
    this.assignments = data.assignments
    this.startDate = startDate
    this.endDate = endDate
    this.dependencies = dependencies
  }
}
