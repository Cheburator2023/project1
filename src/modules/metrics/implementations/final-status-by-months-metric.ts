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
 * - ВАЖНО: Модели с датами в текущем году исключаются из накопительного итога для избежания двойного подсчёта
 */
export class FinalStatusByMonthsMetric extends IndependentMetric<FinalStatusByMonthModelsMetricResult> {
  private finalStatusMetric: IFinalStatusMetric<BaseMetricResult>
  private filteredModelsWithDates: { model: any, date: Date }[] = [];
  private filteredModelsByMonth: { [month: number]: { model: any, date: Date }[] } = {};

  /**
   * Определяет модели, у которых есть финальные даты в указанном году
   * Эти модели должны учитываться только в соответствующих месяцах текущего года,
   * а не в накопительном итоге, чтобы избежать двойного подсчёта
   * 
   * @param models - массив моделей для анализа
   * @param year - год для проверки (обычно текущий год)
   * @returns Set с system_model_id моделей, имеющих даты в указанном году
   */
  private getModelsWithCurrentYearDates(models: any[], year: number): Set<string> {
    const currentYearStart = new Date(year, 0, 1);
    const currentYearEnd = new Date(year, 11, 31);
    const modelsWithCurrentYearDates = new Set<string>();
    
    models.forEach(model => {
      // Проверяем все возможные финальные даты модели
      const modelDates = [
        model.date_of_introduction_into_operation,
        model.developing_end_date,
        model.data_completion_of_stage_05a
      ].filter(Boolean).map(date => new Date(date));
      
      // Если хотя бы одна дата попадает в текущий год
      if (modelDates.some(date => date >= currentYearStart && date <= currentYearEnd)) {
        modelsWithCurrentYearDates.add(model.system_model_id);
      }
    });
    
    return modelsWithCurrentYearDates;
  }

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
   *    - Определяем модели с датами в текущем году (исключаем из накопительного итога)
   *    - Вычисляем накопительный итог за все предыдущие годы (без моделей текущего года)
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
      const currentYear = new Date().getFullYear();
      const currentYearStartStr = `${currentYear}-01-01`;
      const currentYearEndStr = `${currentYear}-12-31`;

      // 1) Берем МОДЕЛИ ТЕКУЩЕГО ГОДА один раз на весь год
      //    Внутри filterModels приоритет дат уже задан: release > developing_end > pilot_end
      //    Поэтому при диапазоне на год каждая модель появится не более одного раза с приоритетной датой
      const currentYearModels = this.finalStatusMetric.filterModels(
        this.models,
        currentYearStartStr,
        currentYearEndStr,
        false,
        true
      ) as { model: any; date: Date }[];

      const currentYearIds = new Set(
        currentYearModels.map(({ model }) => model.system_model_id)
      );

      // 2) Накопительный итог ДО текущего года (исключаем модели, которые уже имеют даты в текущем году)
      const modelsForCumulative = this.models.filter(
        (m) => !currentYearIds.has(m.system_model_id)
      );

      const cumulativeModels = this.finalStatusMetric.filterModels(
        modelsForCumulative,
        null,
        currentYearStartStr,
        false,
        true
      ) as { model: any; date: Date }[];

      // 3) Распределение по месяцам без дублей: одна модель попадает только один раз
      this.filteredModelsByMonth = {};

      const addUnique = (
        acc: { model: any; date: Date }[],
        ids: Set<string>,
        items: { model: any; date: Date }[]
      ) => {
        for (const item of items) {
          const id = item.model.system_model_id;
          if (!ids.has(id)) {
            ids.add(id);
            acc.push(item);
          }
        }
        return acc;
      };

      // Январь: накопительный итог + модели января текущего года (уже уникальные по модели)
      const januaryModels = currentYearModels.filter(({ date }) => date.getMonth() === 0);
      let prevModels: { model: any; date: Date }[] = [];
      const seenIds = new Set<string>();
      prevModels = addUnique(prevModels, seenIds, cumulativeModels);
      prevModels = addUnique(prevModels, seenIds, januaryModels);
      this.filteredModelsByMonth[0] = [...prevModels];
      months[0] = seenIds.size;

      // Остальные месяцы: добавляем только новые модели месяца, без повторений
      for (let month = 1; month < 12; month++) {
        const monthEntries = currentYearModels.filter(({ date }) => date.getMonth() === month);
        prevModels = addUnique(prevModels, seenIds, monthEntries);
        this.filteredModelsByMonth[month] = [...prevModels];
        months[month] = seenIds.size;
      }

      // По умолчанию выгрузка будет за январь (или последний рассчитанный месяц)
      this.filteredModelsWithDates = this.filteredModelsByMonth[0];
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
   * Возвращает детализированные данные для экспорта в Excel за всё время (накопительный итог по всем месяцам)
   */
  public getFilteredRowData() {
    // Собираем уникальные модели из всех месяцев
    const allModelsMap = new Map<string, { model: any, date: Date }>();
    for (let month = 0; month < 12; month++) {
      const data = this.filteredModelsByMonth[month] || [];
      data.forEach(({ model, date }) => {
        // Ключ — уникальный идентификатор модели (например, system_model_id + дата)
        const key = `${model.system_model_id}_${date.toISOString()}`;
        if (!allModelsMap.has(key)) {
          allModelsMap.set(key, { model, date });
        }
      });
    }
    const allModels = Array.from(allModelsMap.values());
    return allModels
      .map(({ model, date }) => {
        const month = date.getMonth() + 1;
        const monthName = date.toLocaleString('ru-RU', { month: 'long' });
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
        if (a.year !== b.year) return a.year - b.year;
        return parseInt(a.month) - parseInt(b.month);
      });
  }
}