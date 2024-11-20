// Базовый тип для всех результатов
export interface BaseMetricResult {
}

// Тип для общих метрик с count и delta
export interface MetricResult extends BaseMetricResult {
  count: number
  delta: number
}

// Тип для метрик с процентным изменением
export interface MetricPercentResult extends BaseMetricResult {
  count: number
  deltaPercent: number
}

export interface PilotsMetricResult extends BaseMetricResult {
  stage05A: number
  stage05B: number
}

export interface TasksMetricResult extends BaseMetricResult {
  datasources: number
  validation: number
}

export interface RegistryCoverageResult extends BaseMetricResult {
  countPercent: number
  deltaPercent: number
}

export interface RiskCoverageFinalStatusResult extends BaseMetricResult {
  countPercent: number
  deltaPercent: number
}

type Months = Extract<keyof { [K in 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11]: any }, number>;

export type FinalStatusByMonthModelsMetricResult = BaseMetricResult & { [key in Months]: number }[Months][];

export type StalledModelsByMonthMetricResult = BaseMetricResult & { [key in Months]: number }[Months][];

type keyPair = [string, number]
export type DistributionByLifecycleStageModelsMetricResult = BaseMetricResult & keyPair[]

