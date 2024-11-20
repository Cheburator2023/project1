import { MetricsEnum } from '../enums'
import { MetricResult } from './base-metric-result.interface'

// Маппинг типов зависимостей метрик
export type MetricDependencyMap = {
  [MetricsEnum.DevelopedModelsMetric]: MetricResult
  [MetricsEnum.ImplementedModelsMetric]: MetricResult,
  [MetricsEnum.MrmModelsMetric]: MetricResult,
  [MetricsEnum.FinalStatusModelsMetric]: MetricResult,
};
