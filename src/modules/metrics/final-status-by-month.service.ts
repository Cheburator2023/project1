import { Injectable } from '@nestjs/common'
import { isValidDate, parseDate } from 'src/system/common/utils'

import { SumDatabaseService } from 'src/system/sum-database/database.service'

import { finalStatusModels as finalStatusSumModels } from './sql/sum'

@Injectable()
export class FinalStatusByMonthService {
  constructor(
    private readonly sumDatabaseService: SumDatabaseService
  ) {
  }

  private mergeArrays(sum: any[], rm: any[]) {
    const result = []

    const rmMap = new Map<string, any>()
    rm.forEach(item => {
      rmMap.set(item.model_id, item)
    })

    sum.forEach(sumItem => {
      const rmItem = rmMap.get(sumItem.model_id)

      if (rmItem) {
        let value

        const isSumValid = isValidDate(sumItem.value)
        const isRmValid = isValidDate(rmItem.value)

        if (isSumValid) {
          value = sumItem.value
        } else if (isRmValid) {
          value = rmItem.value
        } else {
          value = null
        }

        result.push({
          model_id: sumItem.model_id,
          value,
          streams: [sumItem.stream, rmItem.stream]
        })

        rmMap.delete(sumItem.model_id)
      } else {
        result.push({
          model_id: sumItem.model_id,
          value: sumItem.value,
          streams: [sumItem.stream]
        })
      }
    })

    rmMap.forEach(rmItem => {
      result.push({
        model_id: rmItem.model_id,
        value: rmItem.value,
        streams: [rmItem.stream]
      })
    })

    return result
  }

  private filterByStringDate(
    filteredValue: string | null,
    startStringDate: string | null,
    endStringDate: string | null
  ): boolean {
    if (!isValidDate(filteredValue)) return false

    const filteredDate = parseDate(filteredValue)

    if (startStringDate) {
      const startDate = new Date(startStringDate)
      startDate.setHours(0, 0, 0, 0)
      if (filteredDate < startDate) return false
    }

    if (endStringDate) {
      const endDate = new Date(endStringDate)
      endDate.setHours(23, 59, 59, 999)
      if (filteredDate > endDate) return false
    }

    return true
  }

  private filterByStreams(
    filteredStreams: string[],
    streams: string[] | null
  ): boolean {
    if (streams === null) return true

    return filteredStreams.some(filteredStream => streams.includes(filteredStream))
  }

  private calculateDeltaByStringValue(
    values,
    startStringDate: string | null,
    endStringDate: string | null
  ) {
    const now = new Date()
    const targetDate = endStringDate ? new Date(endStringDate) : new Date()
    targetDate.setHours(
      now.getHours(),
      now.getMinutes(),
      now.getSeconds()
    )
    const sevenDaysAgo = new Date(targetDate)
    sevenDaysAgo.setDate(targetDate.getDate() - 7)

    if (startStringDate) {
      const startDate = new Date(startStringDate)
      startDate.setHours(0, 0, 0, 0)
      if (sevenDaysAgo < startDate) return 0
    }

    const pastValues = values.filter(item => {
      const valueDate = parseDate(item.value)
      return valueDate < sevenDaysAgo
    })

    return values.length - pastValues.length
  }

  private async getModels(
    startDate: string | null = null,
    endDate: string | null = null,
    streams: string[] | null = null
  ) {
    const sumRawData = await this.sumDatabaseService.query(finalStatusSumModels, {})
    const sumRmRawData = []
    const mergedData = this.mergeArrays(sumRawData, sumRmRawData)
    const filteredData = mergedData.filter(
      item => this.filterByStringDate(item.value, startDate, endDate) &&
        this.filterByStreams(item.streams, streams)
    )

    return filteredData
  }

  private getMonthlyCounts(arr) {
    const monthlyCounts = Array(12).fill(0)

    arr.forEach(item => {
      if (!isValidDate(item.value)) return

      const date = parseDate(item.value)
      const month = date.getMonth()

      monthlyCounts[month]++
    })

    return monthlyCounts
  }

  async metric(
    startDate: string | null = null,
    endDate: string | null = null,
    streams: string[] | null = null
  ) {
    const models = await this.getModels(startDate, endDate, streams)
    const finalStatusByMonthModels = this.getMonthlyCounts(models)

    return {
      finalStatusByMonthModels
    }
  }
}

