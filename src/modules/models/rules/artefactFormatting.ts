// @TODO: Добавить форматирование boolean
enum ArtefactFormattingType {
  DATE = 'date',
  NUMBER = 'number',
  TEXT = 'text'
}

const ArtefactFormatting: Record<number, ArtefactFormattingType> = {
  1: ArtefactFormattingType.TEXT,
  4: ArtefactFormattingType.DATE,
  16: ArtefactFormattingType.NUMBER,
  17: ArtefactFormattingType.DATE,
}

export { ArtefactFormattingType, ArtefactFormatting }
