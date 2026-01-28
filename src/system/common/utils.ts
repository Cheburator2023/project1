import {
  QUARTER_EDIT_PERIOD_MONTHS,
  QUARTER_EDIT_PERIOD_DAYS
} from 'src/system/common/constants'

interface QueryArgs {
  [key: string]: any
}

interface QueryResult {
  text: string
  values: any[]
}

const queryConvert = (
  parameterizedSql: string,
  args: QueryArgs
): QueryResult => {
  const [text, values] = Object.entries(args).reduce<[string, any[], number]>(
    ([sql, array, index], [key, value]) => [
      sql.replace(new RegExp(`:${key}`, 'gi'), `$${index}`),
      [...array, value],
      index + 1
    ],
    [parameterizedSql, [], 1]
  )

  return { text, values }
}

/**
 * Pads a number with leading zeros to ensure it has a specified length.
 *
 * @param {number} number - The number to pad.
 * @param {number} [length=2] - The desired length of the output string.
 * @returns {string} - The padded number as a string.
 */
const pad = (number: number, length = 2): string => {
  return ('0'.repeat(length) + number).slice(-length)
}

/**
 * Parses a date string in various formats (dd.mm.yyyy, mm/dd/yyyy, yyyy, YYYY-MM-DD) or a Date object into a Date object.
 *
 * @param {string | Date} dateInput - The date string or Date object to parse.
 * @returns {Date | null} - The parsed Date object or null if the format is invalid.
 */
const parseDate = (dateInput: string | Date): Date | null => {
  if (dateInput instanceof Date) {
    // Если это объект Date, просто возвращаем его
    return isNaN(dateInput.getTime())
      ? null
      : new Date(dateInput.getTime() + 3 * 60 * 60 * 1000)
  }

  let date: Date | null = null

  // Формат "2023-02-22 14:51:23+00:00" (дата с опциональным часовым поясом)
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}([+-]\d{2}:\d{2})?$/.test(dateInput)) {
    date = new Date(dateInput.replace(' ', 'T')) // Заменяем пробел на "T", чтобы сделать строку совместимой с ISO
  }
  // Формат "dd.mm.yyyy hh:mm"
  else if (/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/.test(dateInput)) {
    const [datePart, timePart] = dateInput.split(' ')
    const [day, month, year] = datePart.split('.').map(Number)
    const [hours, minutes] = timePart.split(':').map(Number)
    if (month >= 1 && month <= 12) {
      date = new Date(year, month - 1, day, hours, minutes)
    }
  }
  // Формат "dd.mm.yyyy"
  else if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateInput)) {
    const [day, month, year] = dateInput.split('.').map(Number)
    if (month >= 1 && month <= 12) {
      date = new Date(year, month - 1, day)
    }
  }
  // Формат "mm/dd/yyyy"
  else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)) {
    const [month, day, year] = dateInput.split('/').map(Number)
    if (month >= 1 && month <= 12) {
      date = new Date(year, month - 1, day)
    }
  }
  // Формат "yyyy"
  else if (/^\d{4}$/.test(dateInput)) {
    const year = Number(dateInput)
    date = new Date(year, 0, 1)
  }
  // Формат "yyyy-mm-dd"
  else if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [year, month, day] = dateInput.split('-').map(Number)
    date = new Date(year, month - 1, day)
  }

  // Проверка на валидность даты
  return date && !isNaN(date.getTime()) ? date : null
}

/**
 * Formats a Date object into a string in the format yyyy-mm-dd.
 *
 * @param {Date} date - The Date object to format.
 * @returns {string} - The formatted date string.
 */
const formatDateTime = (date: Date): string => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new TypeError('Invalid Date')
  }

  const yyyy = date.getFullYear()
  const MM = pad(date.getMonth() + 1)
  const dd = pad(date.getDate())
  const hh = pad(date.getHours())
  const mm = pad(date.getMinutes())
  const ss = pad(date.getSeconds())

  return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`
}

/**
 * Checks if a given date string or Date object is valid according to the supported formats.
 *
 * @param {string | Date} dateInput - The date string or Date object to validate.
 * @returns {boolean} - True if the date is valid, otherwise false.
 */
const isValidDate = (dateInput: string | Date): boolean => {
  const date = parseDate(dateInput)
  return date !== null
}

/**
 * Returns the end date of a given quarter and year.
 * @param {number} quarter - Quarter number (1-4).
 * @param {number} year - Full year (e.g., 2023).
 * @returns {Date}
 */
const getEndOfQuarter = (quarter, year) =>
  new Date(year, quarter * 3, 0, 23, 59, 59, 999)

/**
 * Returns the start date of a given quarter and year.
 * @param {number} quarter - Quarter number (1-4).
 * @param {number} year - Full year (e.g., 2023).
 * @returns {Date}
 */
const getStartOfQuarter = (quarter, year) =>
  new Date(year, (quarter - 1) * 3, 1, 0, 0, 0, 0)

/**
 * Adds a specified number of months and days to a given date.
 * Safely adjusts for month overflows and varying month lengths.
 *
 * @param {Date} date - The base date to modify.
 * @param {number} months - Number of months to add.
 * @param {number} days - Number of days to add.
 * @returns {Date} A new Date object with the added time.
 */
const addMonthsAndDays = (date, months, days) => {
  const base = new Date(date.getTime())
  const targetMonth = base.getMonth() + months
  const targetYear = base.getFullYear() + Math.floor(targetMonth / 12)
  const newMonth = targetMonth % 12
  const currentDay = base.getDate()
  const daysInTargetMonth = new Date(targetYear, newMonth + 1, 0).getDate()
  const day = Math.min(currentDay, daysInTargetMonth)
  const shiftedDate = new Date(
    targetYear,
    newMonth,
    day,
    base.getHours(),
    base.getMinutes(),
    base.getSeconds(),
    base.getMilliseconds()
  )
  shiftedDate.setTime(shiftedDate.getTime() + days * 24 * 60 * 60 * 1000)
  return shiftedDate
}

/**
 * Determines whether the specified quarter and year can be edited.
 * @param {number} quarter - Quarter number (1-4).
 * @param {number} [year=getNow().getFullYear()] - Year to check.
 * @returns {boolean}
 */
const canEditQuarter = (quarter, year = new Date().getFullYear()) => {
  if (quarter < 1 || quarter > 4) {
    throw new Error('Quarter must be between 1 and 4')
  }

  const now = new Date()
  const startOfQuarter = getStartOfQuarter(quarter, year)
  const endOfQuarter = getEndOfQuarter(quarter, year)

  if (now < startOfQuarter) return false
  if (now <= endOfQuarter) return true

  const gracePeriodEnd = addMonthsAndDays(
    endOfQuarter,
    QUARTER_EDIT_PERIOD_MONTHS,
    QUARTER_EDIT_PERIOD_DAYS
  )

  return now <= gracePeriodEnd
}

const generateModelAlias = (
  rootModelId: string | number | null,
  modelVersion: string | number | null
): string => {
  if (rootModelId == null || modelVersion == null) {
    throw new Error('rootModelId and modelVersion are required')
  }
  return `model${rootModelId}-v${modelVersion}`
}

export {
  queryConvert,
  isValidDate,
  parseDate,
  formatDateTime,
  canEditQuarter,
  generateModelAlias
}
