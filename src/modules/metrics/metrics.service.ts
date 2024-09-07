import { Injectable } from '@nestjs/common';
import { SumDatabaseService } from 'src/system/sum-database/database.service';
import { MrmDatabaseService } from 'src/system/mrm-database/database.service';
import { sql as distributionByLifecycleStageModels } from './sql/distributionByLifecycleStageModels';
import { sql as developedModels } from './sql/developedModels';
import { sql as implementedModels } from './sql/implementedModels';
import { sql as finalStatusModels } from './sql/filnalStatusModels';
import { sql as sumRmModels } from './sql/sumRmModels';
import { sql as isStage05A } from './sql/isStage05A';
import { sql as isTakenOutOfOperationModels } from './sql/isTakenOutOfOperationModels';
import { sql as isOnMonitoringModels } from './sql/isOnMonitoringModels';
import { sql as isStalledModelsByMonth } from './sql/stalledModels';
import { sql as isFinalStatusByMonthModels } from './sql/finalStatusByMonthModels';
import { sql as tasks } from './sql/tasks';

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
        dsStream: string | null,
        filterDate: string | null,
        metricName: string,
        percent: boolean = false,
    ): Promise<number> {
        const targetDate = filterDate ? new Date(filterDate) : new Date();
        const sevenDaysAgo = new Date(targetDate);
        sevenDaysAgo.setDate(targetDate.getDate() - 7);

        const todayString = targetDate.toISOString().split('T')[0];
        const sevenDaysAgoString = sevenDaysAgo.toISOString().split('T')[0];

        const [currentCount, previosCount] = await Promise.all([
            databaseService.query(sqlQuery, [todayString, dsStream]),
            databaseService.query(sqlQuery, [sevenDaysAgoString, dsStream]),
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
        filterDate: string | null = null,
    ) {
        const rawData = await this.sumDatabaseService.query(
            distributionByLifecycleStageModels,
            {
                filter_date: filterDate,
            },
        );

        return {
            distributionByLifecycleStageModels: rawData.map((stage) => [
                stage.bpmn_key_desc,
                stage.count,
            ]),
        };
    }

    private async getDevelopedModels(
        filterDate: string | null = null,
        dsStream: string | null = null,
    ) {
        const rawData = await this.mrmDatabaseService.query(developedModels, [
            filterDate,
            dsStream,
        ]);

        const developedModelsCount = Number(
            rawData[0]?.developed_models_count || 0,
        );

        const delta = await this.calculateDelta(
            developedModels,
            this.mrmDatabaseService,
            dsStream,
            filterDate,
            'developed_models',
        );

        return {
            developedModels: {
                count: developedModelsCount,
                delta: delta,
            },
        };
    }

    private async getImplementedModels(
        filterDate: string | null = null,
        dsStream: string | null = null,
    ) {
        const rawData = await this.mrmDatabaseService.query(implementedModels, [
            filterDate,
            dsStream,
        ]);

        const implementedModelsCount = Number(
            rawData[0]?.implemented_models_count || 0,
        );

        const delta = await this.calculateDelta(
            implementedModels,
            this.mrmDatabaseService,
            dsStream,
            filterDate,
            'implemented_models',
        );

        return {
            implementedModels: {
                count: implementedModelsCount,
                delta: delta,
            },
        };
    }

    private async getFinalStatusModels(
        filterDate: string | null = null,
        dsStream: string | null = null,
    ) {
        const rawData = await this.mrmDatabaseService.query(finalStatusModels, [
            filterDate,
            dsStream,
        ]);

        const finalStatusModelsCount = Number(
            rawData[0]?.final_status_models_count || 0,
        );

        const delta = await this.calculateDelta(
            finalStatusModels,
            this.mrmDatabaseService,
            dsStream,
            filterDate,
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
        filterDate: string | null = null,
        dsStream: string | null = null,
    ) {
        const rawData = await this.mrmDatabaseService.query(sumRmModels, [
            filterDate,
            dsStream,
        ]);

        const sumRmModelsCount = Number(rawData[0]?.sum_rm_models_count || 0);

        const delta = await this.calculateDelta(
            sumRmModels,
            this.mrmDatabaseService,
            dsStream,
            filterDate,
            'sum_rm_models',
        );

        return {
            sumRmModels: {
                count: sumRmModelsCount,
                delta: delta,
            },
        };
    }

    private async getTotalModels(
        filterDate: string | null = null,
        dsStream: string | null = null,
    ) {
        const developedModelsData = await this.getDevelopedModels(
            filterDate,
            dsStream,
        );
        const implementedModelsData = await this.getImplementedModels(
            filterDate,
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
        filterDate: string | null = null,
        dsStream: string | null = null,
    ) {
        const finalStatusModelsData = await this.getFinalStatusModels(
            filterDate,
            dsStream,
        );
        const totalModelsData = await this.getTotalModels(filterDate, dsStream);

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
        filterDate: string | null = null,
        dsStream: string | null = null,
    ) {
        const sumRmModelsData = await this.getSumRmModels(filterDate, dsStream);
        const totalModelsData = await this.getTotalModels(filterDate, dsStream);

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
        filterDate: string | null = null,
        dsStream: string | null = null,
    ) {
        const rawData = await this.mrmDatabaseService.query(isStage05A, [
            filterDate,
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
        filterDate: string | null = null,
        dsStream: string | null = null,
    ) {
        const rawData = await this.mrmDatabaseService.query(
            isTakenOutOfOperationModels,
            [filterDate, dsStream],
        );

        const onTakenOutOfOperation = Number(
            rawData[0]?.taken_out_of_operation_models_count || 0,
        );

        const delta = await this.calculateDelta(
            isTakenOutOfOperationModels,
            this.mrmDatabaseService,
            dsStream,
            filterDate,
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
        filterDate: string | null = null,
        dsStream: string | null = null,
    ) {
        const rawData = await this.mrmDatabaseService.query(
            isOnMonitoringModels,
            [filterDate, dsStream],
        );

        const onMonitoringCount = Number(
            rawData[0]?.on_monitoring_models_count || 0,
        );

        const deltaPercent = await this.calculateDelta(
            isOnMonitoringModels,
            this.mrmDatabaseService,
            dsStream,
            filterDate,
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
        filterDate: string | null = null,
        dsStream: string | null = null,
    ) {
        const rawData = await this.mrmDatabaseService.query(
            isStalledModelsByMonth,
            [filterDate, dsStream],
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
        filterDate: string | null = null,
        dsStream: string | null = null,
    ) {
        const rawData = await this.mrmDatabaseService.query(
            isFinalStatusByMonthModels,
            [filterDate, dsStream],
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

    private async getTasks(filterDate: string | null = null) {
        const rawData = await this.sumDatabaseService.query(tasks, {
            filter_date: filterDate,
        });

        const validationCount = Number(rawData[0]?.validation_count || 0);
        const datasourceCount = Number(rawData[0]?.datasource_count || 0);

        return {
            tasks: {
                validation: validationCount,
                datasources: datasourceCount,
            },
        };
    }

    async getMetrics(date: string, stream: string) {
        const metricsResults = await Promise.all([
            this.getDistributionByLifecycleStageModels(date),
            this.getDevelopedModels(date, stream),
            this.getImplementedModels(date, stream),
            this.getFinalStatusModels(date, stream),
            this.getSumRmModels(date, stream),
            this.getTotalModels(date, stream),
            this.getRiskCovergageFinalStatusModels(date, stream),
            this.getModelsRegistryCoverage(date, stream),
            this.getPilots(date, stream),
            this.getTakenOutOfOperation(date, stream),
            this.getOnMonitoringModels(date, stream),
            this.getStalledModelsByMonth(date, stream),
            this.getFilnalStatusByMonthModels(date, stream),
            this.getTasks(date),
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
