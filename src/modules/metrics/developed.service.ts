import { Injectable } from '@nestjs/common'
import { isValidDate, parseDate } from 'src/system/common/utils'

import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'

import { developedModels as developedSumModels } from './sql/sum';
import { developedModels as developedSumRmModels } from './sql/sum-rm'


@Injectable()
export class DevelopedService {
  constructor(
    private readonly sumDatabaseService: SumDatabaseService,
    private readonly mrmDatabaseService: MrmDatabaseService
  ) {
  }

  private mergeArrays(rm: any[], sum: any[]) {
    const result = []

    const sumMap = new Map<string, any>()
    sum.forEach(item => {
      sumMap.set(item.model_id, item)
    })

    rm.forEach(rmItem => {
      const sumItem = sumMap.get(rmItem.model_id)

      if (rmItem.date_of_introduction_into_operation) {
        return
      }

      if (sumItem) {

        let value

        const isRmValid = isValidDate(rmItem.value)
        const isSumValid = isValidDate(sumItem.value)

        if (isRmValid) {
          value = rmItem.value
        } else if (isSumValid) {
          value = sumItem.value
        } else {
          value = null
        }

        result.push({
          model_id: rmItem.model_id,
          value,
          streams: [rmItem.stream, sumItem.stream],
          date_of_introduction_into_operation: rmItem.date_of_introduction_into_operation
        })

        sumMap.delete(rmItem.model_id)
      } else {
        result.push({
          model_id: rmItem.model_id,
          value: rmItem.value,
          streams: [rmItem.stream],
          date_of_introduction_into_operation: rmItem.date_of_introduction_into_operation
        })
      }
    })

    sumMap.forEach(sumItem => {
      result.push({
        model_id: sumItem.model_id,
        value: sumItem.value,
        streams: [sumItem.stream],
        date_of_introduction_into_operation: sumItem.date_of_introduction_into_operation
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
    const sumRawData = await this.sumDatabaseService.query(developedSumModels, {})
    const sumRmRawData = await this.mrmDatabaseService.query(developedSumRmModels, {})
    const mergedData = this.mergeArrays(sumRmRawData, sumRawData)

    const filteredData = mergedData.filter(
      item => this.filterByStringDate(item.value, startDate, endDate) &&
        this.filterByStreams(item.streams, streams)
    )

    return filteredData
  }

  async metric(
    startDate: string | null = null,
    endDate: string | null = null,
    streams: string[] | null = null
  ) {
    const models = await this.getModels(startDate, endDate, streams)
    const deltaCount = this.calculateDeltaByStringValue(models, startDate, endDate)

    return {
      developedModels: {
        count: models.length,
        delta: deltaCount
      }
    }
  }
}