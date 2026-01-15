export enum MODEL_STATUS {
  DEVELOPED_NOT_IMPLEMENTED = 'Разработана, не внедрена',
  IMPLEMENTED_IN_PIM = 'Разработана, внедрена в ПИМ',
  IMPLEMENTED_OUTSIDE_PIM = 'Разработана, внедрена вне ПИМ',
  REMOVED_FROM_OPERATION = 'Вывод модели из эксплуатации',
  VALIDATED_OUTSIDE_PIM = 'Внедрена вне ПИМ',
  VALIDATED_IN_PIM = 'Внедрена в ПИМ',
  CREATION_ERROR = 'Ошибка заведения',
  ARCHIVE = 'Архив',
  INEFFECTIVE_FOR_BUSINESS = 'Модель не эффективна в бизнес-процессе',
  PENDING_DELETE = 'Ожидает удаления'
}

// Экспортируем ключи для использования в ModelStatusConfigService
export const MODEL_STATUS_KEYS = {
  DEVELOPED_NOT_IMPLEMENTED: 'DEVELOPED_NOT_IMPLEMENTED',
  IMPLEMENTED_IN_PIM: 'IMPLEMENTED_IN_PIM',
  IMPLEMENTED_OUTSIDE_PIM: 'IMPLEMENTED_OUTSIDE_PIM',
  REMOVED_FROM_OPERATION: 'REMOVED_FROM_OPERATION',
  VALIDATED_OUTSIDE_PIM: 'VALIDATED_OUTSIDE_PIM',
  VALIDATED_IN_PIM: 'VALIDATED_IN_PIM',
  CREATION_ERROR: 'CREATION_ERROR',
  ARCHIVE: 'ARCHIVE',
  INEFFECTIVE_FOR_BUSINESS: 'INEFFECTIVE_FOR_BUSINESS',
  PENDING_DELETE: 'PENDING_DELETE',
} as const;