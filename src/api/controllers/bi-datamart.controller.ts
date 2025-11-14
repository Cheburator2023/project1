import { Controller, Post } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { BiDatamartService } from 'src/modules/bi-datamart/bi-datamart.service'
import { TasksDatamartService } from 'src/modules/bi-datamart/tasks-datamart.service'

@ApiTags('BI Витрины')
@Controller('bi-datamart')
export class BiDatamartController {
  constructor(
    private readonly biDatamartService: BiDatamartService,
    private readonly tasksDatamartService: TasksDatamartService
  ) {}

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
    const result = await this.biDatamartService.syncAllModelsToDatamart()

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
    const result = await this.tasksDatamartService.syncAllTasksToDatamart()

    return {
      success: result.success,
      data: result,
      message: result.success
        ? 'Синхронизация витрины задач завершена'
        : 'Синхронизация витрины задач завершилась с ошибками (приложение продолжает работать)'
    }
  }
}
