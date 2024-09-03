import { Injectable } from '@nestjs/common'
import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { sql as distributionByLifecycleStageModels } from './sql/distributionByLifecycleStageModels'

@Injectable()
export class MetricsService {
    constructor(
        private readonly sumDatabaseService: SumDatabaseService
    ) {
    }

    private async getDistributionByLifecycleStageModels() {
        const rawData = await this.sumDatabaseService.query(distributionByLifecycleStageModels, {})

        return {
            distributionByLifecycleStageModels: {
                name: 'Распределение моделей по этапам жцм',
                data: rawData.map(stage => [stage.bpmn_key_desc, stage.count])
            }
        }
    }

    async getMetrics() {
        const metricsResults = await Promise.all([
            this.getDistributionByLifecycleStageModels()
        ])

        const combinedMetrics = metricsResults.reduce((accumulator, currentMetric) => {
            return { ...accumulator, ...currentMetric }
        }, {})

        return combinedMetrics
    }
}
