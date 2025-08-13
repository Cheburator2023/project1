import { IndependentMetric } from '../base';
import { IFinalStatusMetric, MetricResult } from '../interfaces';

export class FinalStatusMetric<T extends MetricResult>
  extends IndependentMetric<T>
  implements IFinalStatusMetric<T>
{
  private filteredModels: any[] = [];
  private deltaFilteredModels: any[] = [];

  calculate() {
    this.filteredModels = [];
    this.deltaFilteredModels = [];

    this.filteredModels = this.filterModels(
      this.models,
      this.startDate,
      this.endDate,
    );

    // delta
    this.filterModels(this.models, this.startDate, this.endDate, true);

    const count = this.filteredModels.length;
    const delta =
      this.deltaFilteredModels.filter((model) => model.period === 'current').length -
      this.deltaFilteredModels.filter((model) => model.period === 'delta').length;

    return {
      count,
      delta,
    } as T;
  }

  public getFilteredRowData() {
    return this.filteredModels.map((model) => ({
      system_model_id: model.system_model_id,
      ds_stream: model.ds_stream,
      model_status: model.model_status,
    }));
  }

  public getFilteredDeltaRowData() {
    return this.deltaFilteredModels.map((model) => ({
      system_model_id: model.system_model_id,
      ds_stream: model.ds_stream,
      model_status: model.model_status,
      filtered_date: model.relevantDate,
      history_status_date: model.historyStatusDate,
      period: model.period,
    }));
  }

  filterModels<T extends boolean>(
    models,
    startDate: string | null,
    endDate: string | null,
    isDeltaCalculation: boolean = false,
    returnDate?: T,
  ): T extends true ? { model: any; date: Date }[] : any[] {
    const { currentRange, deltaRange } = this.getCorrectDateRangeForDelta(
      startDate,
      endDate,
    );

    const { actualStartDate, actualEndDate } = this.getActualDateRange(startDate, endDate, isDeltaCalculation ? 7 : null);

    return models
      .map((model) => {
        // Для расчёта приростов
        // Если у модели по новой логике в истории изменения статуса содержится одно из значений:
        // 'Внедрена вне ПИМ', 'Разработана, не внедрена', 'Внедрена в ПИМ',
        // и дата изменения effective_from попадает во временной срез
        if (isDeltaCalculation && model.status_history) {
          // выбираем только финальные статусы и сортируем от самого раннего к самому позднему
          const finalStatuses = model.status_history
            .filter((historyItem) => {
              return [
                'Внедрена вне ПИМ',
                'Разработана, не внедрена',
                'Внедрена в ПИМ',
                'Архив',
              ].includes(historyItem.status_name);
            })
            .sort(
              (a, b) =>
                new Date(a.effective_from).getTime() -
                new Date(b.effective_from).getTime(),
            );
          if (finalStatuses.length) {
            // берём только самый ранний финальный статус
            const firstFinalStatus = finalStatuses[0];
            const effectiveFrom = new Date(firstFinalStatus.effective_from);

            if (
              this.isWithinDateRange(
                effectiveFrom,
                currentRange.actualStartDate,
                currentRange.actualEndDate,
              )
            ) {
              this.deltaFilteredModels.push({
                ...model,
                historyStatusDate: effectiveFrom,
                period: 'current',
              });
            } else if (
              this.isWithinDateRange(
                effectiveFrom,
                deltaRange.actualStartDate,
                deltaRange.actualEndDate,
              )
            ) {
              this.deltaFilteredModels.push({
                ...model,
                historyStatusDate: effectiveFrom,
                period: 'delta',
              });
            }
            return returnDate ? { model, date: effectiveFrom } : model;
          }
          return null;
        }

        // const decomissDate = model.rs_model_decommiss_date ? new Date(model.rs_model_decommiss_date) : null
        const releaseDate = model.date_of_introduction_into_operation
          ? new Date(model.date_of_introduction_into_operation)
          : null;
        const developingEndDate = model.developing_end_date
          ? new Date(model.developing_end_date)
          : null;
        const pilotEndDate = model.data_completion_of_stage_05a
          ? new Date(model.data_completion_of_stage_05a)
          : null;
        // const createDate = model.create_date ? new Date(model.create_date) : null
        const modelStatus = model.model_status;

        /**
         * 1. Условие: Если "Дата выведения РС/Модели из эксплуатации" входит в выбранный временной срез,
         *    ИЛИ "Дата релиза" модели входит в выбранный временной срез,
         *    ИЛИ "Дата окончания разработки Модели" входит в выбранный временной срез,
         *    ИЛИ "Дата завершения разработки пилота" модели входит в выбранный временной срез,
         *    ИЛИ "Дата создания" модели входит в выбранный временной срез,
         *    ТО модель попадает в категорию "Модели с финальным статусом".
         */
        const modelDates = [
          // decomissDate,
          releaseDate,
          developingEndDate,
          pilotEndDate,
          // createDate
        ];
        const relevantDate = modelDates.find((date) =>
          this.isWithinDateRange(date, actualStartDate, actualEndDate),
        );
        const relevantCurrentDate = modelDates.find((date) =>
          this.isWithinDateRange(date, currentRange.actualStartDate, currentRange.actualEndDate),
        );
        const relevantDeltaDate = modelDates.find((date) =>
          this.isWithinDateRange(date, deltaRange.actualStartDate, deltaRange.actualEndDate),
        );

        /**
         * 2. Условие: Если "Статус модели" равен одному из значений
         *    ТО модель попадает в категорию "Модели с финальным статусом".
         */
        const hasFinalStatus = this.isFinalStatus(modelStatus);

        if (isDeltaCalculation && hasFinalStatus) {
          if (relevantCurrentDate) {
            this.deltaFilteredModels.push({ ...model, relevantDate: relevantCurrentDate, period: 'current' });
          } else if (relevantDeltaDate) {
            this.deltaFilteredModels.push({ ...model, relevantDate: relevantDeltaDate, period: 'delta' });
          }
        }

        if (relevantDate && hasFinalStatus) {
          return returnDate ? { model, date: relevantDate } : model;
        }

        return null;
      })
      .filter(Boolean);
  }
}
