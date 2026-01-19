import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MODEL_STATUS, MODEL_STATUS_KEYS } from 'src/system/common/constants/model-status';
import { MODEL_DISPLAY_MODES } from 'src/system/common/constants/base.constants';

@Injectable()
export class ModelStatusConfigService {
  private enabledStatuses: string[] = [];
  private enabledGroups: string[] = [];

  constructor(private readonly configService: ConfigService) {
    this.loadEnabledStatuses();
    this.loadEnabledGroups();
  }

  private loadEnabledStatuses(): void {
    this.enabledStatuses = [];

    // Проходим по всем статусам из MODEL_STATUS_KEYS
    Object.values(MODEL_STATUS_KEYS).forEach((key) => {
      const envKey = `MODEL_STATUS_${key}`;
      const isEnabled = this.configService.get<string>(envKey);

      // Если статус включен в .env (значение true), добавляем его
      if (isEnabled === 'true') {
        // Получаем значение статуса из MODEL_STATUS по ключу
        const statusValue = MODEL_STATUS[key];
        if (statusValue) {
          this.enabledStatuses.push(statusValue);
        }
      }
    });

    // Если не настроен ни один статус, используем все статусы
    if (this.enabledStatuses.length === 0) {
      this.enabledStatuses = Object.values(MODEL_STATUS);
    }
  }

  private loadEnabledGroups(): void {
    this.enabledGroups = [];

    // Проходим по всем группам из MODEL_DISPLAY_MODES
    Object.keys(MODEL_DISPLAY_MODES).forEach((key) => {
      const envKey = `MODEL_GROUP_${key}`;
      const isEnabled = this.configService.get<string>(envKey);

      if (isEnabled === 'true') {
        this.enabledGroups.push(MODEL_DISPLAY_MODES[key]);
      }
    });

    // Если не настроена ни одна группа, добавляем группу 'Активные' по умолчанию
    if (this.enabledGroups.length === 0) {
      this.enabledGroups.push(MODEL_DISPLAY_MODES.ACTIVE);
    }
  }

  getEnabledStatuses(): string[] {
    return [...this.enabledStatuses];
  }

  getEnabledGroups(): string[] {
    return [...this.enabledGroups];
  }

  getCombinedMode(): string[] {
    // Объединяем статусы и группы в один массив
    return [...this.enabledStatuses, ...this.enabledGroups];
  }

  isStatusEnabled(status: string): boolean {
    return this.enabledStatuses.includes(status);
  }

  reload(): void {
    this.loadEnabledStatuses();
    this.loadEnabledGroups();
  }
}