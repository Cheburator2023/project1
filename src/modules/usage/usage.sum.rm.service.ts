import { Injectable } from '@nestjs/common'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'

@Injectable()
export class UsageSumRmService {
  constructor(
    private readonly mrmDatabaseService: MrmDatabaseService
  ) {
  }

  async update({ model_id, confirmation_date: confirmation_date_string, is_used }) {
    const splDateString = confirmation_date_string.split('.')
    const confirmation_date = `${splDateString[2]}-${splDateString[1]}-${splDateString[0]}`

    const newDate = new Date(confirmation_date)
    const confirmation_year = newDate.getFullYear()
    const confirmation_quarter = Math.floor(newDate.getMonth() / 3) + 1
    const creator = null

    const check = 'SELECT * FROM models_usage WHERE model_id = :model_id AND confirmation_year = :confirmation_year AND confirmation_quarter = :confirmation_quarter'
    const update = `
      UPDATE models_usage
      SET confirmation_date = :confirmation_date,
          is_used    = :is_used
      WHERE model_id = :model_id
        AND confirmation_year = :confirmation_year
        AND confirmation_quarter = :confirmation_quarter
      RETURNING usage_id
    `
    const insert = `
      INSERT INTO models_usage (model_id, confirmation_date, confirmation_year, confirmation_quarter, is_used, creator)
      VALUES (:model_id, :confirmation_date, :confirmation_year, :confirmation_quarter, :is_used, :creator)
      RETURNING usage_id
    `
    const updateHistory = `
      INSERT INTO models_usage_history (usage_id, model_id, confirmation_date, is_used, changed_by)
      VALUES (:usage_id, :model_id, :confirmation_date, :is_used, :creator)
    `

    const [currentItem] = await this.mrmDatabaseService.query(check, { model_id, confirmation_year, confirmation_quarter })

    if (currentItem) {
      const [{ usage_id }] = await this.mrmDatabaseService.query(update, {
        confirmation_date,
        is_used,
        model_id,
        confirmation_year,
        confirmation_quarter
      })

      await this.mrmDatabaseService.query(updateHistory, {
        usage_id,
        model_id,
        confirmation_date,
        is_used: is_used,
        creator
      })
    } else {
      const [{ usage_id }] = await this.mrmDatabaseService.query(insert, { model_id, confirmation_date, confirmation_year, confirmation_quarter, is_used, creator })
      await this.mrmDatabaseService.query(updateHistory, { usage_id, model_id, confirmation_date, is_used, creator })
    }
  }
}
