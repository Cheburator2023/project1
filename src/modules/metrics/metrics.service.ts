import { Injectable } from '@nestjs/common';
import { SumDatabaseService } from 'src/system/sum-database/database.service';
import { MrmDatabaseService } from 'src/system/mrm-database/database.service';

import { developedModels as developedSumModels } from './sql/sum';
import { implementedModels as implementedSumModels } from './sql/sum';
import { getModels as getSumModels } from './sql/sum';
import { distributionByLifecycleStageModels as distributionByLifecycleStageSumModels } from './sql/sum';
import { tasks as sumTasks } from './sql/sum';

import { developedModels as developedSumRmModels } from './sql/sum-rm'
import { implementedModels as implementedSumRmModels } from './sql/sum-rm';
import { finalStatusModels as finalStatusSumRmModels } from './sql/sum-rm';
import { getModels as getSumRmModels } from './sql/sum-rm';
import { isStage05A as isSumRmStage05A } from './sql/sum-rm';
import { isTakenOutOfOperationModels as isTakenOutOfOperationSumRmModels } from './sql/sum-rm';
import { isOnMonitoringModels as isOnMonitoringSumRmModels } from './sql/sum-rm';
import { stalledModels as stalledSumRmModels } from './sql/sum-rm';
import { finalStatusByMonthModels as finalStatusByMonthSumRmModels } from './sql/sum-rm';

@Injectable()
export class MetricsService {
    constructor(
      private readonly sumDatabaseService: SumDatabaseService,
      private readonly mrmDatabaseService: MrmDatabaseService,
    ) {}

    private boundPercentage(value: number): number {
        return Math.min(100, Math.max(-100, value));
    }

    private calculatePercentageCount(
      current: number,
      previous: number,
    ): number {
        if (previous === 0) {
            return 0;
        }

        const percentageChange = (current / previous) * 100;

        return this.boundPercentage(Math.round(percentageChange));
    }

    private calculatePercentageDelta(
      current: number,
      previous: number,
    ): number {
        if (previous === 0) {
            return current > 0 ? 100 : 0;
        }

        const difference = current - previous;
        const percentageChange = (difference / previous) * 100;

        return this.boundPercentage(Math.round(percentageChange));
    }

    private async calculateDelta(
      sqlQuery: string,
      databaseService: any,
      dsStream: string[] | null,
      endDate: string | null,
      metricName: string,
      percent: boolean = false,
    ): Promise<number> {
        const targetDate = endDate ? new Date(endDate) : new Date();
        const sevenDaysAgo = new Date(targetDate);
        sevenDaysAgo.setDate(targetDate.getDate() - 7);

        const endDateString = targetDate.toISOString().split('T')[0];
        const sevenDaysAgoString = sevenDaysAgo.toISOString().split('T')[0];

        const [currentCount, previosCount] = await Promise.all([
            databaseService.query(sqlQuery, [
                endDateString,
                endDateString,
                dsStream && dsStream.length > 0 ? dsStream : null,
            ]),
            databaseService.query(sqlQuery, [
                sevenDaysAgoString,
                sevenDaysAgoString,
                dsStream && dsStream.length > 0 ? dsStream : null,
            ]),
        ]);

        const currentValue = Number(
          currentCount[0]?.[`${metricName}_count`] || 0,
        );
        const previousValue = Number(
          previosCount[0]?.[`${metricName}_count`] || 0,
        );

        if (percent) {
            return this.calculatePercentageDelta(currentValue, previousValue);
        } else {
            return currentValue - previousValue;
        }
    }

    async getDistributionByLifecycleStageModels(
      startDate: string | null = null,
      endDate: string | null = null,
    ) {
        const rawData = await this.sumDatabaseService.query(
          distributionByLifecycleStageSumModels,
          [startDate, endDate],
        );

        return {
            distributionByLifecycleStageModels: rawData.map((stage) => [
                stage.bpmn_key_desc,
                stage.count,
            ]),
        };
    }

    private async getDevelopedModels(
      startDate: string | null = null,
      endDate: string | null = null,
      dsStream: string[] | null = null,
    ) {
        const sumRawData = await this.sumDatabaseService.query(developedSumModels, [
            startDate,
            endDate,
            dsStream,
        ]);

        const sumRmRawData = await this.mrmDatabaseService.query(developedSumRmModels, [
            startDate,
            endDate,
            dsStream,
        ]);

        const developedModelsCount =
          Number(sumRawData[0]?.developed_models_count || 0) +
          Number(sumRmRawData[0]?.developed_models_count || 0);

        const sumDelta = await this.calculateDelta(
          developedSumModels,
          this.sumDatabaseService,
          dsStream,
          endDate,
          'developed_models',
        );

        const sumRmDelta = await this.calculateDelta(
          developedSumRmModels,
          this.mrmDatabaseService,
          dsStream,
          endDate,
          'developed_models',
        );

        const deltaCount = sumDelta + sumRmDelta

        return {
            developedModels: {
                count: developedModelsCount,
                delta: deltaCount,
            },
        };
    }

    private async getImplementedModels(
      startDate: string | null = null,
      endDate: string | null = null,
      dsStream: string[] | null = null,
    ) {
        const sumRawData = await this.sumDatabaseService.query(implementedSumModels, [
            startDate,
            endDate,
            dsStream,
        ]);

        const sumRmRawData = await this.mrmDatabaseService.query(implementedSumRmModels, [
            startDate,
            endDate,
            dsStream,
        ]);

        const implementedModelsCount =
          Number(sumRawData[0]?.implemented_models_count || 0) +
          Number(sumRmRawData[0]?.implemented_models_count || 0);

        const sumDelta = await this.calculateDelta(
          implementedSumModels,
          this.sumDatabaseService,
          dsStream,
          endDate,
          'implemented_models',
        );

        const sumRmDelta = await this.calculateDelta(
          implementedSumRmModels,
          this.mrmDatabaseService,
          dsStream,
          endDate,
          'implemented_models',
        );

        const deltaCount = sumDelta + sumRmDelta

        return {
            implementedModels: {
                count: implementedModelsCount,
                delta: deltaCount,
            },
        };
    }

    private async getFinalStatusModels(
      startDate: string | null = null,
      endDate: string | null = null,
      dsStream: string[] | null = null,
    ) {
        const rawData = await this.mrmDatabaseService.query(finalStatusSumRmModels, [
            startDate,
            endDate,
            dsStream,
        ]);

        const finalStatusModelsCount = Number(
          rawData[0]?.final_status_models_count || 0,
        );

        const delta = await this.calculateDelta(
          finalStatusSumRmModels,
          this.mrmDatabaseService,
          dsStream,
          endDate,
          'final_status_models',
        );

        return {
            finalStatusModels: {
                count: finalStatusModelsCount,
                delta: delta,
            },
        };
    }

    private async getSumRmModels(
      startDate: string | null = null,
      endDate: string | null = null,
      dsStream: string[] | null = null,
    ) {

        const sumRawData = await this.sumDatabaseService.query(getSumModels, [
            startDate,
            endDate,
            dsStream,
        ]);

        const sumRmRawData = await this.mrmDatabaseService.query(getSumRmModels, [
            startDate,
            endDate,
            dsStream,
        ]);

        const modelsCount =
          Number(sumRawData[0]?.sum_models_count || 0) +
          Number(sumRmRawData[0]?.sum_rm_models_count || 0);


        const sumDelta = await this.calculateDelta(
          getSumModels,
          this.sumDatabaseService,
          dsStream,
          endDate,
          'sum_rm_models',
        );

        const sumRmDelta = await this.calculateDelta(
          getSumRmModels,
          this.mrmDatabaseService,
          dsStream,
          endDate,
          'sum_rm_models',
        );

        const deltaCount = sumDelta + sumRmDelta

        return {
            sumRmModels: {
                count: modelsCount,
                delta: deltaCount,
            },
        };
    }

    private async getTotalModels(
      startDate: string | null = null,
      endDate: string | null = null,
      dsStream: string[] | null = null,
    ) {
        const developedModelsData = await this.getDevelopedModels(
          startDate,
          endDate,
          dsStream,
        );
        const implementedModelsData = await this.getImplementedModels(
          startDate,
          endDate,
          dsStream,
        );

        const { count: developedModelsCount, delta: developedModelsDelta } =
          developedModelsData.developedModels;
        const { count: implementedModelsCount, delta: implementedModelsDelta } =
          implementedModelsData.implementedModels;

        const totalModelsCount = developedModelsCount + implementedModelsCount;

        const delta = developedModelsDelta + implementedModelsDelta;

        return {
            totalModels: {
                count: totalModelsCount,
                delta: delta,
            },
        };
    }

    private async getRiskCovergageFinalStatusModels(
      startDate: string | null = null,
      endDate: string | null = null,
      dsStream: string[] | null = null,
    ) {
        const finalStatusModelsData = await this.getFinalStatusModels(
          startDate,
          endDate,
          dsStream,
        );
        const totalModelsData = await this.getTotalModels(
          startDate,
          endDate,
          dsStream,
        );

        const { count: finalStatusModelsCount, delta: finalStatusModelsDelta } =
          finalStatusModelsData.finalStatusModels;
        const { count: totalModelsCount, delta: totalModelsDelta } =
          totalModelsData.totalModels;

        const prevFinalStatusModelsCount =
          finalStatusModelsCount - finalStatusModelsDelta;
        const prevTotalModelsCount = totalModelsCount - totalModelsDelta;

        const riskCovergageFinalStatusModelsCount =
          this.calculatePercentageCount(
            finalStatusModelsCount,
            totalModelsCount,
          );

        const deltaPercent = this.calculatePercentageDelta(
          riskCovergageFinalStatusModelsCount,
          this.calculatePercentageCount(
            prevFinalStatusModelsCount,
            prevTotalModelsCount,
          ),
        );

        return {
            riskCoverageFinalStatusModels: {
                countPercent: riskCovergageFinalStatusModelsCount,
                deltaPercent: deltaPercent,
            },
        };
    }

    private async getModelsRegistryCoverage(
      startDate: string | null = null,
      endDate: string | null = null,
      dsStream: string[] | null = null,
    ) {
        const sumRmModelsData = await this.getSumRmModels(
          startDate,
          endDate,
          dsStream,
        );
        const totalModelsData = await this.getTotalModels(
          startDate,
          endDate,
          dsStream,
        );

        const { count: sumRmModelsCount, delta: sumRmModelsDelta } =
          sumRmModelsData.sumRmModels;
        const { count: totalModelsCount, delta: totalModelsDelta } =
          totalModelsData.totalModels;

        const prevSumRmModelsCount = sumRmModelsCount - sumRmModelsDelta;
        const prevTotalModelsCount = totalModelsCount - totalModelsDelta;

        const registryCoverageModelsCount = this.calculatePercentageCount(
          sumRmModelsCount,
          totalModelsCount,
        );

        const deltaPercent = this.calculatePercentageDelta(
          registryCoverageModelsCount,
          this.calculatePercentageCount(
            prevSumRmModelsCount,
            prevTotalModelsCount,
          ),
        );

        return {
            registryCoverageModels: {
                countPercent: registryCoverageModelsCount,
                deltaPercent: deltaPercent,
            },
        };
    }

    private async getPilots(
      startDate: string | null = null,
      endDate: string | null = null,
      dsStream: string[] | null = null,
    ) {
        const rawData = await this.mrmDatabaseService.query(isSumRmStage05A, [
            startDate,
            endDate,
            dsStream,
        ]);

        const stage05ACount = Number(rawData[0]?.stage_05a_count || 0);

        return {
            pilots: {
                stage05A: stage05ACount,
                stage05B: 0,
            },
        };
    }

    private async getTakenOutOfOperation(
      startDate: string | null = null,
      endDate: string | null = null,
      dsStream: string[] | null = null,
    ) {
        const rawData = await this.mrmDatabaseService.query(
          isTakenOutOfOperationSumRmModels,
          [startDate, endDate, dsStream],
        );

        const onTakenOutOfOperation = Number(
          rawData[0]?.taken_out_of_operation_models_count || 0,
        );

        const delta = await this.calculateDelta(
          isTakenOutOfOperationSumRmModels,
          this.mrmDatabaseService,
          dsStream,
          endDate,
          'taken_out_of_operation_models',
          true,
        );

        return {
            takenOutOfOperationModels: {
                count: onTakenOutOfOperation,
                deltaPercent: delta,
            },
        };
    }

    private async getOnMonitoringModels(
      startDate: string | null = null,
      endDate: string | null = null,
      dsStream: string[] | null = null,
    ) {
        const rawData = await this.mrmDatabaseService.query(
          isOnMonitoringSumRmModels,
          [startDate, endDate, dsStream],
        );

        const onMonitoringCount = Number(
          rawData[0]?.on_monitoring_models_count || 0,
        );

        const deltaPercent = await this.calculateDelta(
          isOnMonitoringSumRmModels,
          this.mrmDatabaseService,
          dsStream,
          endDate,
          'on_monitoring_models',
          true,
        );

        return {
            onMonitoringModels: {
                count: onMonitoringCount,
                deltaPercent: deltaPercent,
            },
        };
    }

    private async getStalledModelsByMonth(
      startDate: string | null = null,
      endDate: string | null = null,
      dsStream: string[] | null = null,
    ) {
        const rawData = await this.mrmDatabaseService.query(
          stalledSumRmModels,
          [startDate, endDate, dsStream],
        );

        const stalledModelsByMonth = Array(12).fill(0);

        rawData.forEach((row) => {
            const monthIndex = row.month - 1;
            stalledModelsByMonth[monthIndex] = Number(row.stalled_models_count);
        });

        return {
            stalledModelsByMonth,
        };
    }

    private async getFilnalStatusByMonthModels(
      startDate: string | null = null,
      endDate: string | null = null,
      dsStream: string[] | null = null,
    ) {
        const rawData = await this.mrmDatabaseService.query(
          finalStatusByMonthSumRmModels,
          [startDate, endDate, dsStream],
        );

        const finalStatusByMonthModels = Array(12).fill(0);

        rawData.forEach((row) => {
            const monthIndex = row.month - 1;
            finalStatusByMonthModels[monthIndex] = Number(
              row.final_status_by_month_count,
            );
        });

        return {
            finalStatusByMonthModels,
        };
    }

    private async getTasks(
      startDate: string | null = null,
      endDate: string | null = null,
    ) {
        const rawData = await this.sumDatabaseService.query(sumTasks, [
            startDate,
            endDate,
        ]);

        const validationCount = Number(rawData[0]?.validation_count || 0);
        const datasourceCount = Number(rawData[0]?.datasource_count || 0);

        return {
            tasks: {
                validation: validationCount,
                datasources: datasourceCount,
            },
        };
    }

    async getMetrics(
      startDate: string,
      endDate: string,
      stream: string[] | null,
    ) {
        const metricsResults = await Promise.all([
            this.getDistributionByLifecycleStageModels(startDate, endDate),
            this.getDevelopedModels(startDate, endDate, stream),
            this.getImplementedModels(startDate, endDate, stream),
            this.getFinalStatusModels(startDate, endDate, stream),
            this.getSumRmModels(startDate, endDate, stream),
            this.getTotalModels(startDate, endDate, stream),
            this.getRiskCovergageFinalStatusModels(startDate, endDate, stream),
            this.getModelsRegistryCoverage(startDate, endDate, stream),
            this.getPilots(startDate, endDate, stream),
            this.getTakenOutOfOperation(startDate, endDate, stream),
            this.getOnMonitoringModels(startDate, endDate, stream),
            this.getStalledModelsByMonth(startDate, endDate, stream),
            this.getFilnalStatusByMonthModels(startDate, endDate, stream),
            this.getTasks(startDate, endDate),
        ]);

        const combinedMetrics = metricsResults.reduce(
          (accumulator, currentMetric) => {
              return { ...accumulator, ...currentMetric };
          },
          {},
        );

        return combinedMetrics;
    }
}
