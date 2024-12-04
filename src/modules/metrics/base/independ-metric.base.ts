import { MetricBase } from './metric.base';
import { BaseMetricResult } from '../interfaces';
import { IIndependentMetric } from '../interfaces';

export abstract class IndependentMetric<T extends BaseMetricResult> extends MetricBase<T> implements IIndependentMetric<T> {
  protected models: any[];
  protected startDate: string | null;
  protected endDate: string | null;

  /**
   * Initializes the metric with models and a date range.
   *
   * @param data - The data to process.
   * @param startDate - The start of the date range.
   * @param endDate - The end of the date range.
   */
  initialize(data: any, startDate: string | null, endDate: string | null): void {
    this.models = data.models
    this.tasks = data.tasks
    this.startDate = startDate;
    this.endDate = endDate;
  }
}
