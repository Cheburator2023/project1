const HISTORY_READ_SOURCES = ['sum', 'mrm'] as const

type HistoryReadSource = (typeof HISTORY_READ_SOURCES)[number]

const isHistoryReadSource = (value: string): value is HistoryReadSource =>
  (HISTORY_READ_SOURCES as readonly string[]).includes(value)

export { HISTORY_READ_SOURCES, HistoryReadSource, isHistoryReadSource }
