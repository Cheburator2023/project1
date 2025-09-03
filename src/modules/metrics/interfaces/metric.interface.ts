import { MetricsEnum } from '../enums'
import { MetricDependencyMap } from './metric-dependency-map.type'
import { BaseMetricResult } from './base-metric-result.interface'

// Общий интерфейс метрики
export interface IMetric<T extends BaseMetricResult> {
  initialize(...args: any[]): void

  calculate(): T

  getMetricName(): MetricsEnum
}

// Интерфейс для независимой метрики
export interface IIndependentMetric<T extends BaseMetricResult>
  extends IMetric<T> {
  initialize(
    models: any[],
    startDate: string | null,
    endDate: string | null
  ): void
}

// Интерфейс для зависимой метрики
export interface IDependentMetric<
  T extends BaseMetricResult,
  D extends Partial<MetricDependencyMap>
> extends IMetric<T> {
  initialize(
    models: any[],
    startDate: string | null,
    endDate: string | null,
    dependencies: { [K in keyof D]: D[K] }
  ): void
}
