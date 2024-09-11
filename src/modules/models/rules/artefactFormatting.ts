// @TODO: Добавить форматирование boolean
enum ArtefactFormattingType {
  DATE = 'date',
  NUMBER = 'number'
}

const ArtefactFormatting: Record<number, ArtefactFormattingType> = {
  4: ArtefactFormattingType.DATE,
  17: ArtefactFormattingType.DATE,
  16: ArtefactFormattingType.NUMBER,
}

export { ArtefactFormattingType, ArtefactFormatting }
