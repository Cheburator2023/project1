const pad = (number: number, length = 2): string => {
  return ('0'.repeat(length) + number).slice(-length)
}

export function formatDateTime(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new TypeError('Invalid Date')
  }

  const yyyy = date.getFullYear()
  const MM = pad(date.getMonth() + 1)
  const dd = pad(date.getDate())

  return `${dd}.${MM}.${yyyy}`
}
