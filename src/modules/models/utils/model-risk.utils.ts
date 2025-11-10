/**
 * Получает значение КМР по умолчанию для отчёта (100%)
 * @param modelRisk - Коэффициент модельного риска
 * @returns КМР или 100% если не заполнено
 */
export function getDefaultModelRiskForReport(
  modelRisk: number | string | null | undefined
): number {
  if (modelRisk === null || modelRisk === undefined || modelRisk === '') {
    return 100
  }

  const kmrValue =
    typeof modelRisk === 'string' ? parseFloat(modelRisk) : modelRisk

  if (isNaN(kmrValue)) {
    return 100
  }

  return kmrValue
}
