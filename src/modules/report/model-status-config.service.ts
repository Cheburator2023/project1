import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MODEL_STATUS, MODEL_STATUS_KEYS } from 'src/system/common/constants/model-status';

@Injectable()
export class ModelStatusConfigService {
  private enabledStatuses: string[] = [];

  constructor(private readonly configService: ConfigService) {
    this.loadEnabledStatuses();
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

  getEnabledStatuses(): string[] {
    return [...this.enabledStatuses];
  }

  isStatusEnabled(status: string): boolean {
    return this.enabledStatuses.includes(status);
  }

  reload(): void {
    this.loadEnabledStatuses();
  }
}