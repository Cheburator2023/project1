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
    PENDING_DELETE = 'Ожидает удаления',
}