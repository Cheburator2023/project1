import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { DatabaseSchemaService } from './database-schema.service'

@ApiTags('Схема базы данных')
@Controller('database-schema')
export class DatabaseSchemaController {
  constructor(private readonly databaseSchemaService: DatabaseSchemaService) {}

  @Get('full')
  @ApiOperation({ summary: 'Получить полную схему базы данных' })
  @ApiResponse({
    status: 200,
    description: 'Полная схема базы данных успешно получена'
  })
  @ApiResponse({
    status: 500,
    description: 'Ошибка при получении схемы базы данных'
  })
  async getFullDatabaseSchema() {
    return this.databaseSchemaService.getFullDatabaseSchema()
  }
}
