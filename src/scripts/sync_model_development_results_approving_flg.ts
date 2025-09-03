/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config({ path: '.env.dev' })

import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { ArtefactValueEntity } from 'src/modules/artefacts/entities'

const ART_1 = 'Модель принята владельцем, внедрение требуется'
const ART_2 = 'Модель принята владельцем, внедрение не требуется'
const ART_3 = 'Модель принята владельцем, внедрение на стороне заказчика'
const ART_4 = 'Модель не принята владельцем, доработки не актуальны'
const ART_5 = 'Внедряется'
const ART_6 = 'Не внедряется'

const sumDb = new SumDatabaseService()
const mrmDb = new MrmDatabaseService()

// "убираем" из РМ заполненные артефакты, которые уже имеют значения в СУМ
const processArtefactsSumToMrm = async () => {
  const sumSql = `
    select model_id 
        from artefact_realizations
        where artefact_id = 827 
            and effective_to = '9999-12-31 23:59:59.000'
    `
  const sumModels = await sumDb.query(sumSql)
  console.log(
    `Найдено ${sumModels.length} моделей с заполненным Решением о внедрении`
  )
  console.log(sumModels)

  const mrmSql = `
  update artefact_realizations_new
    set effective_to = now()
    where artefact_id = 2081 
      and effective_to = '9999-12-31 23:59:59.000' 
      and model_id in (:models);
  `
  await mrmDb.query(mrmSql, {
    models: sumModels.map((model) => model.model_id)
  })

  console.log('Обновение РМ завершено')
}

const getIdByValue = (array: Array<ArtefactValueEntity>, value: string) => {
  return array.find((item) => item.artefact_value === value)?.artefact_value_id
}

// Переносим артефакты, заполненные в РМ, но отсутствующие в СУМ
const processArtefactsMrmToSum = async () => {
  // Получаем список artefact_value из РМ для Решения о внедрении
  const mrmArtefactValuesSelectSql = `select * from artefact_values where artefact_id = 2081;`
  const mrmArtefactValues = await mrmDb.query(mrmArtefactValuesSelectSql)

  // Получаем список artefact_value из СУМ для Решения о внедрении
  const sumArtefactValuesSelectSql = `select * from artefact_values where artefact_id = 827;`
  const sumArtefactValues = await sumDb.query(sumArtefactValuesSelectSql)

  // Выбираем заполненные артефакты Решение о внедрении из РМ, мапим value_id
  const mrmSelectSql = `
    select 
      model_id,
      case 
        when arn.artefact_value_id = ${getIdByValue(
          mrmArtefactValues,
          ART_1
        )} then ${getIdByValue(sumArtefactValues, ART_1)}
        when arn.artefact_value_id = ${getIdByValue(
          mrmArtefactValues,
          ART_2
        )} then ${getIdByValue(sumArtefactValues, ART_2)}
        when arn.artefact_value_id = ${getIdByValue(
          mrmArtefactValues,
          ART_3
        )} then ${getIdByValue(sumArtefactValues, ART_3)}
        when arn.artefact_value_id = ${getIdByValue(
          mrmArtefactValues,
          ART_4
        )} then ${getIdByValue(sumArtefactValues, ART_4)}
        when arn.artefact_value_id = ${getIdByValue(
          mrmArtefactValues,
          ART_5
        )} then ${getIdByValue(sumArtefactValues, ART_5)}
        when arn.artefact_value_id = ${getIdByValue(
          mrmArtefactValues,
          ART_6
        )} then ${getIdByValue(sumArtefactValues, ART_6)}
        else null
      end as artefact_value_id,
      artefact_string_value,
      creator,
      artefact_original_value,
      effective_from,
      effective_to
    from artefact_realizations_new arn
    where artefact_id = 2081 and effective_to = '9999-12-31 23:59:59.000'
  `
  const mrmArtefacts = await mrmDb.query(mrmSelectSql)
  console.log(`Получено ${mrmArtefacts.length} артефактов из РМ`)

  // Получаем список моделей СУМ, в которых заполнен артефакт Решение о внедрении
  const sumSelectSql = `
    select model_id 
        from sumcore.artefact_realizations
        where artefact_id = 827 
            and effective_to = '9999-12-31 23:59:59.000'
  `
  const sumArtefacts = await sumDb.query(sumSelectSql)
  console.log(`Получено ${sumArtefacts.length} артефактов из СУМ`)

  // Перебираем оба массива. Если в sumArtefacts уже есть модель, то убираем её из mrmArtefacts.
  const insertArtefacts = mrmArtefacts.filter(
    (mrmArtefact) =>
      !sumArtefacts.some(
        (sumArtefact) => sumArtefact.model_id === mrmArtefact.model_id
      )
  )
  console.log(`Подготовлено для вставки ${insertArtefacts.length} артефактов`)

  // Вставка артефактов из РМ в СУМ
  const sumInsertSql = `
    insert into artefact_realizations (artefact_id, model_id, artefact_value_id, artefact_string_value, effective_from, effective_to, creator, artefact_original_value)
    values (827, :model_id, :artefact_value_id, :artefact_string_value, :effective_from, :effective_to, :creator, :artefact_original_value)
  `
  insertArtefacts.forEach(async (artefact) => {
    await sumDb.query(sumInsertSql, artefact)
    console.log(`Добавлен артефакт для модели ${artefact.model_id}`)
  })
}

async function runMigrations() {
  console.log('Начало синхронизации')

  try {
    await processArtefactsSumToMrm()
    await processArtefactsMrmToSum()

    console.log('Синхронизация завершена успешно')
  } catch (error) {
    console.log(`ОШИБКА: ${error.message}`)
    process.exit(1)
  }
}

runMigrations().finally(() => process.exit(0))
