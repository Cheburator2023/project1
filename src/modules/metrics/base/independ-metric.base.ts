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
   * @param models - The models to process.
   * @param startDate - The start of the date range.
   * @param endDate - The end of the date range.
   */
  initialize(models: any[], startDate: string | null, endDate: string | null): void {
    this.models = models;
    this.startDate = startDate;
    this.endDate = endDate;
  }
}
