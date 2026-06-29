import { Controller, Post, Body, UseGuards, HttpException, HttpStatus, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { Roles } from 'src/decorators/roles.decorator';
import { RolesGuard } from 'src/api/guards/roles.guard';
import { User, UserType } from 'src/decorators/user.decorator';
import { RateLimit } from '../guards/rate-limit.guard';
import { AuditService } from '../../modules/audit/audit.service';
import { AUDIT_EVENT_SUMD_MRMSUPLOADREPORT } from '../../modules/audit/audit.constants';
import { v4 as uuidv4 } from 'uuid';
import { AuditReportExportRequestDto } from '../dto/audit-report-export-request.dto';

@ApiTags('Аудит')
@ApiBearerAuth('JWT-auth')
@ApiSecurity('JWT-auth')
@Controller('audit')
@UseGuards(RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Post('report-export')
  @Roles('model_read')
  @RateLimit({ limit: 10, windowMs: 60 * 1000 })
  @ApiOperation({
    summary: 'Логирование факта выгрузки отчета',
    description: 'Отправляет событие аудита о том, что пользователь инициировал выгрузку отчета (Excel)',
  })
  @ApiBody({ type: AuditReportExportRequestDto })
  @ApiResponse({ status: 201, description: 'Аудит зарегистрирован' })
  @ApiResponse({ status: 401, description: 'Требуется аутентификация' })
  @ApiResponse({ status: 403, description: 'Нет прав доступа' })
  @ApiResponse({ status: 429, description: 'Превышен лимит запросов' })
  async reportExport(
    @Body() request: AuditReportExportRequestDto,
    @User() user: UserType,
  ) {
    const correlationId = uuidv4();
    const initiator = {
      sub: user?.preferred_username ?? user?.family_name ?? 'unknown',
      channel: 'internal',
      realm: user?.roles ?? '',
    };

    // Отправляем START
    this.auditService.sendEvent(
      AUDIT_EVENT_SUMD_MRMSUPLOADREPORT,
      'START',
      correlationId,
      initiator,
      { templateId: request.template_id, date: request.date, filters: request.filters },
    );

    // Отправляем SUCCESS
    this.auditService.sendEvent(
      AUDIT_EVENT_SUMD_MRMSUPLOADREPORT,
      'SUCCESS',
      correlationId,
      initiator,
      { templateId: request.template_id, date: request.date, filters: request.filters },
    );

    return { success: true };
  }
}