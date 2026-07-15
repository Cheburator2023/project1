import type { QuarterInfoDto } from './dto/quarterly-confirmation.dto'

type QuarterRef = {
  quarter: number
  year: number
}

type QuarterAvailability = QuarterRef & {
  startDate: Date
  endDate: Date
  availableUntil: Date
}

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getQuarterAvailability = ({
  quarter,
  year
}: QuarterRef): QuarterAvailability => ({
  quarter,
  year,
  startDate: new Date(year, (quarter - 1) * 3, 1, 0, 0, 0, 0),
  endDate: new Date(year, quarter * 3, 0, 23, 59, 59, 999),
  // Квартал доступен до конца первого календарного месяца после его завершения.
  availableUntil: new Date(year, quarter * 3 + 1, 0, 23, 59, 59, 999)
})

const getPreviousQuarter = ({ quarter, year }: QuarterRef): QuarterRef =>
  quarter === 1
    ? { quarter: 4, year: year - 1 }
    : { quarter: quarter - 1, year }

/**
 * Выбирает доступный квартал с ближайшим окончанием периода заполнения.
 * При подтвержденной политике одновременно активны не более двух кварталов:
 * текущий и предыдущий в первый месяц нового квартала.
 */
export const resolveActiveQuarter = (
  now: Date = new Date()
): QuarterInfoDto | null => {
  const currentQuarter: QuarterRef = {
    quarter: Math.floor(now.getMonth() / 3) + 1,
    year: now.getFullYear()
  }

  const activeQuarters = [getPreviousQuarter(currentQuarter), currentQuarter]
    .map(getQuarterAvailability)
    .filter(
      ({ startDate, availableUntil }) =>
        now >= startDate && now <= availableUntil
    )
    .sort(
      (left, right) =>
        left.availableUntil.getTime() - right.availableUntil.getTime()
    )

  const selected = activeQuarters[0]
  if (!selected) return null

  return {
    quarter: selected.quarter,
    year: selected.year,
    startDate: formatLocalDate(selected.startDate),
    endDate: formatLocalDate(selected.endDate),
    maxDate: formatLocalDate(selected.availableUntil)
  }
}
