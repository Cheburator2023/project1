import { Controller, Get, Post, Query, Body, BadRequestException, NotFoundException } from '@nestjs/common'
import { ArtefactRealizationsService } from '../services'

@Controller('api/v1/artefact-realizations')
export class ArtefactRealizationsController {
  constructor(private readonly service: ArtefactRealizationsService) {}

  @Get('by-key')
  async getByKey(
    @Query('model_id') model_id?: string,
    @Query('artefact_id') artefact_id?: string,
    @Query('as_of') as_of?: string
  ) {
    if (!model_id || !artefact_id) {
      throw new BadRequestException({ error: { code: 'INVALID_ARGUMENT', message: 'model_id and artefact_id required' } })
    }
    const row = await this.service.getByKey({ model_id, artefact_id, as_of })
    if (!row) throw new NotFoundException()
    return row
  }

  @Post('query')
  async query(@Body() body: any) {
    const { model_ids, artefact_ids, as_of, limit, cursor, include_not_found } = body || {}
    if (!Array.isArray(model_ids) || !model_ids.length) {
      throw new BadRequestException({ error: { code: 'INVALID_ARGUMENT', message: 'model_ids required' } })
    }
    if (!Array.isArray(artefact_ids) || !artefact_ids.length) {
      throw new BadRequestException({ error: { code: 'INVALID_ARGUMENT', message: 'artefact_ids required' } })
    }
    return this.service.query({ model_ids, artefact_ids, as_of, limit, cursor, include_not_found })
  }
}


