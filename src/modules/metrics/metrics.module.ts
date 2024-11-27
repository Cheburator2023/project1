import { Module } from '@nestjs/common'
import { DataAggregator, MetricsAggregator } from './aggregators'
import { ModelsModule } from 'src/modules/models/models.module'
import { AssignmentModule } from 'src/modules/assignments/assignment.module'
import {
  DevelopedMetric,
  ImplementedMetric,
  TotalMetric,
  MrmMetric,
  PilotsMetric,
  FinalStatusMetric,
  OnMonitoringMetric,
  TakenOutOfOperationMetric,
  RegistryCoverageMetric,
  RiskCoverageFinalStatusMetric,
  TasksMetric,
  StalledModelsByMonthsMetric,
  FinalStatusByMonthsMetric,
  DistributionByLifecycleStageMetric,
} from './implementations'
import { MetricsEnum } from './enums'

@Module({
  providers: [
    DataAggregator,
    MetricsAggregator,
    {
      provide: 'INDEPENDENT_METRICS',
      useFactory: () => [
        new DevelopedMetric(MetricsEnum.DevelopedModelsMetric),
        new ImplementedMetric(MetricsEnum.ImplementedModelsMetric),
        new MrmMetric(MetricsEnum.MrmModelsMetric),
        new PilotsMetric(MetricsEnum.PilotsMetric),
        new FinalStatusMetric(MetricsEnum.FinalStatusModelsMetric),
        new OnMonitoringMetric(MetricsEnum.OnMonitoringModelsMetric),
        new TakenOutOfOperationMetric(MetricsEnum.TakenOutOfOperationModelsMetric),
        new TasksMetric(MetricsEnum.TasksMetric),
        new StalledModelsByMonthsMetric(MetricsEnum.StalledModelsByMonthMetric),
        new FinalStatusByMonthsMetric(MetricsEnum.FinalStatusByMonthModelsMetric),
        new DistributionByLifecycleStageMetric(MetricsEnum.DistributionByLifecycleStageModelsMetric),
      ]
    },
    {
      provide: 'DEPENDENT_METRICS',
      useFactory: () => [
        new TotalMetric(MetricsEnum.TotalModelsMetric),
        new RegistryCoverageMetric(MetricsEnum.RegistryCoverageModelsMetric),
        new RiskCoverageFinalStatusMetric(MetricsEnum.RiskCoverageFinalStatusModelsMetric),
      ]
    }
  ],
  imports: [
    ModelsModule,
    AssignmentModule
  ],
  exports: [MetricsAggregator]
})
export class MetricsModule {
}
