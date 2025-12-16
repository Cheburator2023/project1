import { Injectable } from '@nestjs/common';
import { ModelsService } from 'src/modules/models/models.service';
import { LoggerService } from '../../system/logger/logger.service';

@Injectable()
export class ReportDataService {
  constructor(
    private readonly modelsService: ModelsService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Унифицированный метод получения моделей для отчетов
   * Аналогичен логике в ReportService.getReport
   */
  async getReportModels(
    date?: string,
    groups?: string[],
    mode: string[] = [],
    reportDate?: string
  ): Promise<any[]> {
    try {
      // Используем тот же метод, что и ReportService
      const models = await this.modelsService.getModels(
        {
          date: date || null,
          mode: mode,
          ignoreModeFilter: false,
        },
        groups || []
      );

      // Применяем фильтрацию по reportDate для расчета устаревания КМР
      // Эта логика аналогична ReportService.generateReportData
      if (reportDate && mode?.includes('model_risk_calculation')) {
        this.logger.debug('Применяем расчет устаревания КМР для отчета', { reportDate });
        // Здесь должна быть логика расчета устаревания КМР
        // которая применяется в ReportService.generateReportData
      }

      return models;
    } catch (error) {
      this.logger.error('Ошибка при получении моделей для отчета:', error);
      throw error;
    }
  }

  /**
   * Применение фильтров шаблонов к моделям
   */
  applyTemplateFilter(models: any[], template_id?: number): any[] {
    if (!template_id) {
      return models;
    }

    switch (template_id) {
      case 1: // ПУРС - фильтр: record_id IS NOT NULL
        return models.filter(model =>
          model.record_id !== null &&
          model.record_id !== undefined &&
          model.record_id !== ''
        );
      case 2: // ПУМР - фильтр: active_model = '1'
        return models.filter(model => model.active_model === '1');
      default:
        return models;
    }
  }

  /**
   * Форматирование моделей для конкретного шаблона
   */
  formatModelsForTemplate(models: any[], template_id?: number): any[] {
    if (!template_id) {
      return models;
    }

    return models.map(model => {
      // Базовые поля, общие для всех шаблонов
      const baseModel = {
        system_model_id: model.system_model_id,
        update_date: model.update_date,
        model_name_validation: model.model_name_validation,
        model_desc: model.model_desc,
      };

      if (template_id === 1) {
        // Формат для ПУРС (template_id=1)
        return {
          ...baseModel,
          record_id: model.record_id,
          group_company: model.group_company,
          rating_system_name: model.rating_system_name,
          regulatory_code_rs_pvr: model.regulatory_code_rs_pvr,
          description_rating_system: model.description_rating_system,
          model_type: model.model_type,
          identifier_model_algorithm_for_rwa: model.identifier_model_algorithm_for_rwa,
          regulatory_code_model_pvr: model.regulatory_code_model_pvr,
          model_version: model.model_version,
          internal_model_number: model.internal_model_number,
          active_model: model.active_model,
          model_indicator: model.model_indicator,
          calibration_version: model.calibration_version,
          calibration_date: model.calibration_date,
          regulatory_code_of_asset_class: model.regulatory_code_of_asset_class,
          model_alias: model.model_alias,
          model_id_from_model_owner: model.model_id_from_model_owner,
          classification_rs_algorithm_by_asset_classes: model.classification_rs_algorithm_by_asset_classes,
          significance_validity: model.significance_validity,
          degree_of_regulatory_supervision: model.degree_of_regulatory_supervision,
          materiality_rate: model.materiality_rate,
          impact_coverage: model.impact_coverage,
          responsible_for_significance_validity: model.responsible_for_significance_validity,
          classification_of_rs_by_order_of_application_within_pvr: model.classification_of_rs_by_order_of_application_within_pvr,
          credit_risk_component: model.credit_risk_component,
          method_calculation_model_parameter: model.method_calculation_model_parameter,
          segment_name: model.segment_name,
          implementation_segment: model.implementation_segment,
          regulatory_class: model.regulatory_class,
          regulatory_subclass: model.regulatory_subclass,
          business_customer: model.business_customer,
          business_customer_departament: model.business_customer_departament,
          goals_using_results_of_work_rs: model.goals_using_results_of_work_rs,
          implementation_validity: model.implementation_validity,
          validity_approve: model.validity_approve,
          bank_document: model.bank_document,
          rs_model_decommiss_date: model.rs_model_decommiss_date,
          remove_decision: model.remove_decision,
          ds_department: model.ds_department,
          assignment_contractor: model.assignment_contractor,
          developing_start_date: model.developing_start_date,
          developing_end_date: model.developing_end_date,
          data_source_description: model.data_source_description,
          target: model.target,
          calibration_method: model.calibration_method,
          developing_report: model.developing_report,
          name_and_version_rating_system: model.name_and_version_rating_system,
          version_it_implementation: model.version_it_implementation,
          responsible_subdivision_and_project_lead_for_it_implementation: model.responsible_subdivision_and_project_lead_for_it_implementation,
          date_of_it_introduction_into_operation: model.date_of_it_introduction_into_operation,
          psi_protocol: model.psi_protocol,
          validation_department: model.validation_department,
          plan_validation_type: model.plan_validation_type,
          validation_period: model.validation_period,
          validation_report_approve_date: model.validation_report_approve_date,
          validation_result: model.validation_result,
          validation_result_approve_date: model.validation_result_approve_date,
          auto_validation_result: model.auto_validation_result,
          importance_changes: model.importance_changes,
          approve_importance: model.approve_importance,
          approve_importance_changes: model.approve_importance_changes,
          date_and_number_regulator_notification: model.date_and_number_regulator_notification,
          date_submission_to_regulator: model.date_submission_to_regulator,
          decision_date_and_number_of_application_model_for_segment: model.decision_date_and_number_of_application_model_for_segment,
          notification_date_and_number_of_application_model_for_segment: model.notification_date_and_number_of_application_model_for_segment,
          decision_date_and_number_of_application_model: model.decision_date_and_number_of_application_model,
          notification_date_and_number_of_application_model: model.notification_date_and_number_of_application_model,
          start_date_of_application_model_approved_regulator: model.start_date_of_application_model_approved_regulator
        };
      } else if (template_id === 2) {
        // Формат для ПУМР (template_id=2)
        return {
          ...baseModel,
          group_company: model.group_company,
          model_id: model.model_id,
          model_version: model.model_version,
          model_type: model.model_type,
          model_risk_type: model.model_risk_type,
          implementation_segment: model.implementation_segment,
          business_customer: model.business_customer,
          business_customer_departament: model.business_customer_departament,
          significance_validity: model.significance_validity,
          responsible_for_significance_validity: model.responsible_for_significance_validity,
          implementation_validity: model.implementation_validity,
          validity_approve: model.validity_approve,
          rs_model_decommiss_date: model.rs_model_decommiss_date,
          remove_decision: model.remove_decision,
          model_changes_info: model.model_changes_info,
          ds_department: model.ds_department,
          developing_report: model.developing_report,
          developing_end_date: model.developing_end_date,
          validation_report_approve_date: model.validation_report_approve_date,
          validation_result: model.validation_result,
          validation_result_approve_date: model.validation_result_approve_date,
          auto_validation_result: model.auto_validation_result,
          active_model: model.active_model,
          model_risk_coefficient: model.model_risk_coefficient
        };
      }

      return model;
    });
  }
}