import { Injectable } from '@nestjs/common'

import { FinalStatusService } from './final-status.service'
import { SumRmService } from './sum-rm.service'

@Injectable()
export class RegistryCoverageFinalService {
  constructor(
    private readonly finalStatusService: FinalStatusService,
    private readonly sumRmService: SumRmService
  ) {
  }

  private boundPercentage(value: number): number {
    return Math.min(100, Math.max(-100, value))
  }

  private calculatePercentageCount(
    current: number,
    previous: number
  ): number {
    if (previous === 0) {
      return 0
    }

    const percentageChange = (current / previous) * 100

    return this.boundPercentage(Math.round(percentageChange))
  }

  private calculatePercentageDelta(
    current: number,
    previous: number
  ): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0
    }

    const difference = current - previous
    const percentageChange = (difference / previous) * 100

    return this.boundPercentage(Math.round(percentageChange))
  }

  async metric(
    startDate: string | null = null,
    endDate: string | null = null,
    streams: string[] | null = null
  ) {
    const { finalStatusModels } = await this.finalStatusService.metric(startDate, endDate, streams)
    const { sumRmModels } = await this.sumRmService.metric(startDate, endDate, streams)

    const registryCoverageModelsCount = this.calculatePercentageCount(
      finalStatusModels.count,
      sumRmModels.count
    )

    const deltaPercent = this.calculatePercentageDelta(
      registryCoverageModelsCount,
      this.calculatePercentageCount(
        finalStatusModels.count,
        sumRmModels.count
      )
    )

    return {
      riskCoverageFinalStatusModels: {
        countPercent: registryCoverageModelsCount,
        deltaPercent: deltaPercent
      }
    }
  }
}

