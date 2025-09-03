import { IDependentMetric } from '../interfaces'
import { MetricDependencyMap } from '../interfaces'

export type DependentMetricType = IDependentMetric<
  any,
  Partial<MetricDependencyMap>
>
