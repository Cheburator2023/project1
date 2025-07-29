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
  private filteredModelsWithDates: { model: any, date: Date }[] = [];

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
      
      // Для выгрузки: получаем ВСЕ модели от начала времени до конца текущего года
      this.filteredModelsWithDates = this.finalStatusMetric.filterModels(
        this.models,
        null, // Без ограничения по начальной дате - берем все модели
        `${currentYear}-12-31`, // До конца текущего года
        false,
        true
      )
      
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
      // Получаем отфильтрованные модели с датами для экспорта
      this.filteredModelsWithDates = this.finalStatusMetric.filterModels(
        this.models,
        this.startDate,
        this.endDate,
        false,
        true
      ).filter(({ date }) => {
        // Фильтруем модели по актуальному диапазону дат
        return date >= actualStartDate && date <= actualEndDate
      })

      // Распределяем модели по месяцам в рамках выбранного диапазона
      this.filteredModelsWithDates.forEach(({ date }) => {
        const modelMonth = date.getMonth()
        months[modelMonth]++
      })
    }

    return months
  }

  /**
   * Возвращает детализированные данные для экспорта в Excel
   * Каждая строка содержит информацию о модели и месяце её попадания в категорию
   * 
   * @returns массив объектов с данными о моделях для экспорта
   */
  public getFilteredRowData() {
    // Используем уже отфильтрованные данные из calculate()
    return this.filteredModelsWithDates
      .map(({ model, date }) => {
        const month = date.getMonth() + 1 // Месяц от 1 до 12
        const monthName = date.toLocaleString('ru-RU', { month: 'long' })
        
        return {
          system_model_id: model.system_model_id,
          ds_stream: model.ds_stream,
          model_status: model.model_status,
          relevant_date: date.toISOString().replace('T', ' ').substring(0, 19),
          month: `${month}`.padStart(2, '0'),
          month_name: monthName,
          year: date.getFullYear()
        }
      })
      .sort((a, b) => {
        // Сортируем по году, затем по месяцу
        if (a.year !== b.year) {
          return a.year - b.year
        }
        return parseInt(a.month) - parseInt(b.month)
      })
  }
}
