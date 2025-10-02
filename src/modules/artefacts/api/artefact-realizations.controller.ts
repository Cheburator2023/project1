import { Controller, Get, Post, Query, Body, BadRequestException, NotFoundException } from '@nestjs/common'
import { ArtefactRealizationsService } from '../services'
import { LoggerService } from 'src/system/logger/logger.service'

@Controller('artefact-realizations')
export class ArtefactRealizationsController {
  constructor(
    private readonly service: ArtefactRealizationsService,
    private readonly logger: LoggerService
  ) {}

  @Get('by-key')
  async getByKey(
    @Query('model_id') model_id?: string,
    @Query('artefact_id') artefact_id?: string,
    @Query('as_of') as_of?: string,
    @Query('include_history') include_history?: string
  ) {
    this.logger.info('GET /artefact-realizations/by-key', 'ЗапросАртефактаПоКлючу', {
      model_id,
      artefact_id,
      as_of,
      include_history
    });

    if (!model_id || !artefact_id) {
      this.logger.warn('Missing required parameters', 'ОтсутствуютОбязательныеПараметры', {
        model_id,
        artefact_id
      });
      throw new BadRequestException({ error: { code: 'INVALID_ARGUMENT', message: 'model_id and artefact_id required' } })
    }

    let includeHistory = false;
    if (include_history !== undefined && include_history !== null) {
      includeHistory = include_history.toLowerCase() === 'true' || include_history === '1';
    }

    try {
      const result = await this.service.getByKey({ model_id, artefact_id, as_of, include_history: includeHistory });
      // Handle different response formats based on include_history parameter
      if (includeHistory) {
        // For history requests, always return the result (even if history array is empty)
        if (result === null || result === undefined) {
          this.logger.warn('Service returned null for history request', 'СервисВернулNullДляИстории', {
            model_id,
            artefact_id
          });
          return { history: [] };
        }
        
        // Ensure result has history property
        if (typeof result === 'object' && result !== null) {
          if (!result.hasOwnProperty('history')) {
            this.logger.warn('Service returned object without history property', 'СервисВернулОбъектБезИстории', {
              model_id,
              artefact_id
            });
            return { history: [] };
          }
          return result;
        } else {
          this.logger.warn('Service returned unexpected type for history request', 'НеожиданныйТипДляИстории', {
            model_id,
            artefact_id,
            result_type: typeof result
          });
          return { history: [] };
        }
      } else {
        // For default requests, throw NotFoundException if no active record found
        if (!result) {
          this.logger.warn('No active record found', 'АктивнаяЗаписьНеНайдена', {
            model_id,
            artefact_id
          });
          throw new NotFoundException();
        }
        return result;
      }
    } catch (error) {
      this.logger.error('Error in getByKey', 'ОшибкаВGetByKey', error, {
        model_id,
        artefact_id,
        include_history: includeHistory
      });
      // For history requests, return empty history instead of throwing
      if (includeHistory) {
        this.logger.warn('Returning empty history array due to error', 'ВозвратПустойИсторииИзЗаОшибки');
        return { history: [] };
      }

      throw error;
    }
  }

  @Post('query')
  async query(@Body() body: any) {
    this.logger.info('POST /artefact-realizations/query', 'ЗапросАртефактов', {
      body
    });

    const { model_ids, artefact_ids, as_of, limit, cursor, include_not_found } = body || {};

    if (!Array.isArray(model_ids) || !model_ids.length) {
      this.logger.warn('Invalid model_ids parameter', 'НеверныйПараметрModelIds', {
        model_ids
      });
      throw new BadRequestException({ error: { code: 'INVALID_ARGUMENT', message: 'model_ids required' } });
    }

    if (!Array.isArray(artefact_ids) || !artefact_ids.length) {
      this.logger.warn('Invalid artefact_ids parameter', 'НеверныйПараметрArtefactIds', {
        artefact_ids
      });
      throw new BadRequestException({ error: { code: 'INVALID_ARGUMENT', message: 'artefact_ids required' } });
    }

    try {
      const result = await this.service.query({ model_ids, artefact_ids, as_of, limit, cursor, include_not_found });
      this.logger.info('Query completed successfully', 'УспешноеВыполнениеЗапроса', {
        items_count: result.items.length,
        not_found_count: result.not_found.length
      });
      return result;
    } catch (error) {
      this.logger.error('Error in query', 'ОшибкаВQuery', error, {
        model_ids_count: model_ids?.length,
        artefact_ids_count: artefact_ids?.length
      });
      throw error;
    }
  }
}
