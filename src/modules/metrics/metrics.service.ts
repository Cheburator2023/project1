import { Injectable } from '@nestjs/common';
import { SumDatabaseService } from 'src/system/sum-database/database.service';
import { MrmDatabaseService } from 'src/system/mrm-database/database.service';

import { ImplementedService } from './implemented.service'
import { DevelopedService } from './developed.service'
import { TotalService } from './total.service'
import { SumRmService } from './sum-rm.service'
import { PilotsService } from './pilots.service'
import { OutOfOperationService } from './out-of-operation.service'
import { RegistryCoverageService } from './registry-coverage.service'
import { FinalStatusService } from './final-status.service'
import { FinalStatusByMonthService } from './final-status-by-month.service'
import { RegistryCoverageFinalService } from './registry-coverage-final.service'
import { IsOnMonitoringService } from './isOnMonitoring.service';

import { distributionByLifecycleStageModels as distributionByLifecycleStageSumModels } from './sql/sum';
import { tasks as sumTasks } from './sql/sum';

import { stalledModels as stalledSumRmModels } from './sql/sum-rm';

@Injectable()
export class MetricsService {
    constructor(
      private readonly sumDatabaseService: SumDatabaseService,
      private readonly mrmDatabaseService: MrmDatabaseService,
      private readonly implementedService: ImplementedService,
      private readonly developedService: DevelopedService,
      private readonly totalService: TotalService,
      private readonly sumRmService: SumRmService,
      private readonly pilotsService: PilotsService,
      private readonly outOfOperationService: OutOfOperationService,
      private readonly registryCoverageService: RegistryCoverageService,
      private readonly finalStatusService: FinalStatusService,
      private readonly finalStatusByMonthService: FinalStatusByMonthService,
      private readonly registryCoverageFinalService: RegistryCoverageFinalService,
      private readonly isOnMonitoringService: IsOnMonitoringService
    ) {}

    private boundPercentage(value: number): number {
        return Math.min(100, Math.max(-100, value));
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
      dsStream: string[] | null = null,
    ) {
        const rawData = await this.sumDatabaseService.query(
          distributionByLifecycleStageSumModels,
          [startDate, endDate, dsStream],
        );

        return {
            distributionByLifecycleStageModels: rawData.map((stage) => [
                stage.bpmn_key_desc,
                stage.count,
            ]),
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

    private async getTasks(
      startDate: string | null = null,
      endDate: string | null = null,
      dsStream: string[] | null = null,
    ) {
        const rawData = await this.sumDatabaseService.query(sumTasks, [
            startDate,
            endDate,
            dsStream,
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
            this.implementedService.metric(startDate, endDate, stream),
            this.developedService.metric(startDate, endDate, stream),
            this.totalService.metric(startDate, endDate, stream),

            this.finalStatusService.metric(startDate, endDate, stream),
            this.finalStatusByMonthService.metric(startDate, endDate, stream),
            this.pilotsService.metric(startDate, endDate, stream),
            this.registryCoverageService.metric(startDate, endDate, stream),
            this.registryCoverageFinalService.metric(startDate, endDate, stream),
            this.sumRmService.metric(startDate, endDate, stream),
            this.outOfOperationService.metric(startDate, endDate, stream),

            this.isOnMonitoringService.metric(startDate, endDate, stream),

            // @TODO: нужно пересмотреть
            this.getDistributionByLifecycleStageModels(startDate, endDate, stream),
            this.getStalledModelsByMonth(startDate, endDate, stream),
            this.getTasks(startDate, endDate, stream),
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
