import { IndependentMetric } from '../base'
import { BaseMetricResult, FinalStatusByMonthModelsMetricResult, IFinalStatusMetric } from '../interfaces'
import { FinalStatusMetric } from './final-status-metric'
import { MetricsEnum } from '../enums'

/**
 * Метрика "Модели с финальным статусом по месяцам"
 * 
 * Особенности расчета:
 * - При отсутствии выбранного временного диапазона используется накопительный итог
 * - Январь показывает: накопительный итог за все предыдущие годы + модели за текущий январь
 * - Остальные месяцы показывают: накопительный итог до этого месяца включительно
 * - При выбранном временном диапазоне используется стандартная логика фильтрации
 */
export class FinalStatusByMonthsMetric extends IndependentMetric<FinalStatusByMonthModelsMetricResult> {
  private finalStatusMetric: IFinalStatusMetric<BaseMetricResult>

  /**
   * Переопределяет базовый метод getActualDateRange
   * 
   * Логика работы:
   * - Если startDate и endDate не указаны: устанавливает диапазон от начала текущего года 
   *   до последнего дня текущего месяца
   * - Если даты указаны: вызывает базовый метод для стандартной обработки
   * 
   * @param startDate - начальная дата фильтрации (может быть null)
   * @param endDate - конечная дата фильтрации (может быть null)
   * @returns объект с actualStartDate и actualEndDate
   */
  getActualDateRange(
    startDate: string | null,
    endDate: string | null
  ): { actualStartDate: Date; actualEndDate: Date } {
    if (!startDate && !endDate) {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth()

      // Устанавливаем диапазон по умолчанию: с начала текущего года до конца текущего месяца
      const defaultStartDate = new Date(year, 0, 1) // 1 января текущего года
      const defaultEndDate = new Date(year, month + 1, 0) // Последний день текущего месяца

      return {
        actualStartDate: defaultStartDate,
        actualEndDate: defaultEndDate
      }
    }

    // Если даты указаны, используем стандартную логику базового класса
    return super.getActualDateRange(startDate, endDate)
  }

  /**
   * Основной метод расчета метрики
   * 
   * Алгоритм работы:
   * 1. Инициализация базовой метрики для получения моделей с финальным статусом
   * 2. Если временной диапазон не выбран:
   *    - Вычисляем накопительный итог за все предыдущие годы
   *    - Для каждого месяца добавляем модели за этот месяц к накопительному итогу
   * 3. Если временной диапазон выбран:
   *    - Используем стандартную логику фильтрации по выбранному диапазону
   * 
   * @returns массив из 12 элементов, где каждый элемент - количество моделей накопительным итогом
   */
  calculate(): FinalStatusByMonthModelsMetricResult {
    // Инициализируем базовую метрику для работы с моделями финального статуса
    this.finalStatusMetric = new FinalStatusMetric(MetricsEnum.FinalStatusModelsMetric)
    this.finalStatusMetric.initialize(
      this.models,
      this.startDate,
      this.endDate
    )

    // Получаем актуальный диапазон дат для фильтрации
    const { actualStartDate, actualEndDate } = this.getActualDateRange(
      this.startDate,
      this.endDate
    )

    // Инициализируем массив результатов: 12 месяцев, начальное значение 0
    const months: FinalStatusByMonthModelsMetricResult = Array.from({ length: 12 }, (_, index) => (0)) as FinalStatusByMonthModelsMetricResult

    // Логика для случая, когда временной диапазон НЕ выбран
    if (!this.startDate && !this.endDate) {
      const currentYear = new Date().getFullYear()
      
      // Шаг 1: Получаем накопительный итог (все модели до начала текущего года)
      const cumulativeModels = this.finalStatusMetric.filterModels(
        this.models,
        null, // Без ограничения по начальной дате - берем все модели
        `${currentYear}-01-01`, // Ограничиваем до начала текущего года
        false,
        true
      )

      // Подсчитываем количество моделей в накопительном итоге
      let cumulativeCount = 0
      cumulativeModels.forEach(({ date }) => {
        // Включаем все модели до текущего года в накопительный итог
        cumulativeCount++
      })

      // Шаг 2: Для каждого месяца добавляем модели за этот месяц к накопительному итогу
      for (let month = 0; month < 12; month++) {
        // Определяем границы текущего месяца
        const monthStartDate = new Date(currentYear, month, 1) // Первый день месяца
        const monthEndDate = new Date(currentYear, month + 1, 0) // Последний день месяца

        // Получаем модели за конкретный месяц текущего года
        const monthModels = this.finalStatusMetric.filterModels(
          this.models,
          monthStartDate.toISOString().split('T')[0], // Форматируем дату в YYYY-MM-DD
          monthEndDate.toISOString().split('T')[0],
          false,
          true
        )

        // Добавляем модели за этот месяц к накопительному счетчику
        monthModels.forEach(({ date }) => {
          // Проверяем, что модель действительно относится к текущему месяцу
          if (date.getMonth() === month) {
            cumulativeCount++
          }
        })

        // Устанавливаем накопительный итог для текущего месяца
        months[month] = cumulativeCount
      }
    } else {
      // Логика для случая, когда временной диапазон ВЫБРАН
      // Используем стандартную логику фильтрации по выбранному диапазону
      const filteredModelsWithDates = this.finalStatusMetric.filterModels(
        this.models,
        this.startDate,
        this.endDate,
        false,
        true
      )

      // Распределяем модели по месяцам в рамках выбранного диапазона
      filteredModelsWithDates.forEach(({ date }) => {
        const modelMonth = date.getMonth()
        // Проверяем, что дата модели попадает в выбранный диапазон
        const isInRange =
          date >= actualStartDate &&
          date <= actualEndDate
        if (isInRange) {
          months[modelMonth]++
        }
      })
    }

    return months
  }
}
