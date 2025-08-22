import { Controller, Get, Post, Query, Body, BadRequestException, NotFoundException, Logger } from '@nestjs/common'
import { ArtefactRealizationsService } from '../services'

@Controller('artefact-realizations')
export class ArtefactRealizationsController {
  private readonly logger = new Logger(ArtefactRealizationsController.name)

  constructor(private readonly service: ArtefactRealizationsService) {}



  @Get('by-key')
  async getByKey(
    @Query('model_id') model_id?: string,
    @Query('artefact_id') artefact_id?: string,
    @Query('as_of') as_of?: string,
    @Query('include_history') include_history?: string
  ) {
    if (!model_id || !artefact_id) {
      this.logger.warn(`Missing required parameters: model_id=${model_id}, artefact_id=${artefact_id}`)
      throw new BadRequestException({ error: { code: 'INVALID_ARGUMENT', message: 'model_id and artefact_id required' } })
    }
    
    // Convert include_history string to boolean with robust parsing
    let includeHistory = false
    if (include_history !== undefined && include_history !== null) {
      includeHistory = include_history.toLowerCase() === 'true' || include_history === '1'
    }
    
    try {
      const result = await this.service.getByKey({ model_id, artefact_id, as_of, include_history: includeHistory })
      
      // Handle different response formats based on include_history parameter
      if (includeHistory) {
        // For history requests, always return the result (even if history array is empty)
        if (result === null || result === undefined) {
          this.logger.warn(`Service returned null for history request, returning empty history array`)
          return { history: [] }
        }
        
        // Ensure result has history property
        if (typeof result === 'object' && result !== null) {
          if (!result.hasOwnProperty('history')) {
            this.logger.warn(`Service returned object without history property`)
            return { history: [] }
          }
          return result
        } else {
          this.logger.warn(`Service returned unexpected type for history request: ${typeof result}`)
          return { history: [] }
        }
      } else {
        // For default requests, throw NotFoundException if no active record found
        if (!result) {
          this.logger.warn(`No active record found for model_id=${model_id}, artefact_id=${artefact_id}`)
          throw new NotFoundException()
        }
        return result
      }
    } catch (error) {
      this.logger.error(`Error in getByKey: ${error.message}`, error.stack)
      
      // For history requests, return empty history instead of throwing
      if (includeHistory) {
        this.logger.warn(`Returning empty history array due to error`)
        return { history: [] }
      }
      
      // For default requests, re-throw the error
      throw error
    }
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


