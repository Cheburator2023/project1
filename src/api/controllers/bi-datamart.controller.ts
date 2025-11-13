import { Controller, Post, Get, Put } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { BiDatamartService } from 'src/modules/bi-datamart/bi-datamart.service'
import { TasksDatamartService } from 'src/modules/bi-datamart/tasks-datamart.service'
import { BiDatamartSafeWrapperService } from 'src/modules/bi-datamart/bi-datamart-safe-wrapper.service'

@ApiTags('BI Витрины')
@Controller('bi-datamart')
export class BiDatamartController {
  private readonly MANUAL_SYNC_TIMEOUT = 
    parseInt(process.env.BI_DATAMART_SYNC_TIMEOUT_MS || '1800000')

  constructor(
    private readonly biDatamartService: BiDatamartService,
    private readonly tasksDatamartService: TasksDatamartService,
    private readonly safeWrapper: BiDatamartSafeWrapperService
  ) {}

  @ApiOperation({
    summary: 'Проверка здоровья BI витрины',
    description: 'Возвращает статус здоровья витрины и защитного механизма'
  })
  @ApiResponse({
    status: 200,
    description: 'Статус BI витрины'
  })
  @Get('/health')
  async getHealth() {
    const health = this.safeWrapper.getHealthStatus()
    const nextRecoveryMinutes = Math.round(health.nextRecoveryTimeout / 60000)
    
    return {
      success: true,
      data: {
        ...health,
        status: health.isHealthy ? 'healthy' : 'unhealthy',
        message: health.isHealthy
          ? 'BI витрина работает нормально'
          : `BI витрина временно отключена после ${health.consecutiveFailures} ошибок. Попытка восстановления #${health.recoveryAttempts} через ${nextRecoveryMinutes} минут`,
        nextRecoveryInMinutes: nextRecoveryMinutes
      }
    }
  }

  @ApiOperation({
    summary: 'Принудительно включить витрину',
    description: 'Включает витрину даже если она была отключена автоматически'
  })
  @ApiResponse({
    status: 200,
    description: 'Витрина включена'
  })
  @Put('/enable')
  async enableDatamart() {
    this.safeWrapper.forceEnable()
    return {
      success: true,
      message: 'BI витрина принудительно включена'
    }
  }

  @ApiOperation({
    summary: 'Принудительно отключить витрину',
    description: 'Отключает витрину до ручного включения'
  })
  @ApiResponse({
    status: 200,
    description: 'Витрина отключена'
  })
  @Put('/disable')
  async disableDatamart() {
    this.safeWrapper.forceDisable()
    return {
      success: true,
      message: 'BI витрина принудительно отключена'
    }
  }

  @ApiOperation({
    summary: 'Синхронизировать витрину моделей',
    description: 'Синхронизирует все модели с BI витриной данных (ЗАЩИЩЕНО от ошибок)'
  })
  @ApiResponse({
    status: 200,
    description: 'Синхронизация витрины моделей завершена'
  })
  @Post('/sync/models')
  async syncModelsDatamart() {
    const result = await this.safeWrapper.safeExecute(
      () => this.biDatamartService.syncAllModelsToDatamart(),
      {
        success: false,
        totalProcessed: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: ['Синхронизация не выполнена - защитный механизм'],
        duration_ms: 0
      },
      'manual_syncModelsDatamart',
      this.MANUAL_SYNC_TIMEOUT
    )

    return {
      success: result.success,
      data: result,
      message: result.success
        ? 'Синхронизация витрины моделей завершена'
        : 'Синхронизация витрины моделей завершилась с ошибками (приложение продолжает работать)'
    }
  }

  @ApiOperation({
    summary: 'Синхронизировать витрину задач',
    description: 'Синхронизирует все задачи с BI витриной данных (ЗАЩИЩЕНО от ошибок)'
  })
  @ApiResponse({
    status: 200,
    description: 'Синхронизация витрины задач завершена'
  })
  @Post('/sync/tasks')
  async syncTasksDatamart() {
    const result = await this.safeWrapper.safeExecute(
      () => this.tasksDatamartService.syncAllTasksToDatamart(),
      {
        success: false,
        totalProcessed: 0,
        inserted: 0,
        deleted: 0,
        errors: ['Синхронизация Tasks не выполнена - защитный механизм'],
        duration_ms: 0
      },
      'manual_syncTasksDatamart',
      this.MANUAL_SYNC_TIMEOUT
    )

    return {
      success: result.success,
      data: result,
      message: result.success
        ? 'Синхронизация витрины задач завершена'
        : 'Синхронизация витрины задач завершилась с ошибками (приложение продолжает работать)'
    }
  }
}
