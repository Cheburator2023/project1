import { Injectable } from '@nestjs/common'
import { SumDatabaseService } from 'src/system/sum-database/database.service'


import { parseDate } from 'src/system/common/utils'

@Injectable()
export class UsageSumService {
  constructor(
    private readonly sumDatabaseService: SumDatabaseService
  ) {
  }

  async update({ model_id, confirmation_date, is_used: confirmed }) {
    const date = parseDate(confirmation_date)
    const confirmation_year = date.getFullYear()
    const month = date.getMonth()
    const quarter = Math.floor(month / 3) + 1

    const check = 'SELECT * FROM model_usage_confirm WHERE model_id = :model_id AND confirmation_year = :confirmation_year AND quarter = :quarter'
    const update = `
      UPDATE model_usage_confirm
      SET confirmation_date = :confirmation_date,
          confirmed    = :confirmed
      WHERE model_id = :model_id
        AND confirmation_year = :confirmation_year
        AND quarter = :quarter
    `
    const insert = `
      INSERT INTO model_usage_confirm (model_id, quarter, confirmation_date, confirmation_year, confirmed)
      VALUES (:model_id, :quarter, :confirmation_date, :confirmation_year, :confirmed)
    `
    const updateHistory = `
      INSERT INTO model_usage_confirm_history (model_id, quarter, creator_full_name, effective_year, confirmed)
      VALUES (:model_id, :quarter, :creator_full_name, :effective_year, :confirmed)
    `

    const [currentItem] = await this.sumDatabaseService.query(check, { model_id, confirmation_year, quarter })

    if (currentItem) {
      const params = {
        confirmation_date: date || currentItem.confirmation_date,
        confirmed: confirmed !== undefined ? confirmed : currentItem.confirmed,
        model_id,
        confirmation_year,
        quarter
      }

      await this.sumDatabaseService.query(update, params)

      const historyParams = {
        model_id,
        quarter,
        creator_full_name: 'ds_lead',
        effective_year: confirmation_year,
        confirmed: confirmed !== undefined ? confirmed : currentItem.confirmed
      }
      await this.sumDatabaseService.query(updateHistory, historyParams)

    } else {
      await this.sumDatabaseService.query(insert, { model_id, quarter, confirmation_date: date, confirmation_year, confirmed })
      await this.sumDatabaseService.query(updateHistory, { model_id, quarter, creator_full_name: 'ds_lead', effective_year: confirmation_year, confirmed })
    }
  }
}
