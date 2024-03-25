import { Controller, Post, Get, Put, Delete, Param, ValidationPipe, UsePipes, Body, ParseArrayPipe, Res, HttpStatus, Query, Req } from "@nestjs/common";
import { ApiBody } from "@nestjs/swagger";
import { ApiService } from "./api.service";
import { ModelCreateDto, ModelsUpdateDto, ModelArtefactHistoryDto, ArtefactsUpdateDto } from "./dto/index.dto";

@Controller()
export class ApiController {
  constructor(private readonly apiService: ApiService) {
  }

  @Get("/models/")
  models() {
    return this.apiService.getModels();
  }

  @UsePipes(new ValidationPipe({ transform: true }))
  @Post("/model/create/")
  @ApiBody({ type: [ModelCreateDto] })
  async modelCreate(@Body(new ParseArrayPipe({ items: ModelCreateDto, whitelist: true })) artefacts: ModelCreateDto[], @Res() response) {
    const result = await this.apiService.modelCreate(artefacts);

    return response.status(HttpStatus.CREATED).json(result[0]);
  }

  @UsePipes(new ValidationPipe({ transform: true }))
  @Put("/models/update/")
  @ApiBody({ type: [ModelsUpdateDto] })
  async modelsUpdate(@Body(new ParseArrayPipe({ items: ModelsUpdateDto, whitelist: true })) modelsArtefacts: ModelsUpdateDto[], @Res() response) {
    const result = await this.apiService.modelsUpdate(modelsArtefacts);

    return response.status(HttpStatus.ACCEPTED).json(result);
  }

  @UsePipes(new ValidationPipe({ transform: true }))
  @Get("/model/artefact/history/")
  async getModelHistory(@Query() query: ModelArtefactHistoryDto, @Res() response) {
    const result = await this.apiService.getModelHistory(query);

    return response.status(HttpStatus.ACCEPTED).json(result);
  }

  @Get("/templates/")
  getTemplates() {
    return this.apiService.getTemplates();
  }

  @Get("/templates/:id/")
  getTemplate(@Param("id") id) {
    return this.apiService.getTemplate(id);
  }

  // @Put("/templates/:id")
  // updateTemplate(@Param("id") id) {
  //   return this.apiService.updateTemplate(id);
  // }
  //
  // @Post("/templates/")
  // createTemplate() {
  //   return this.apiService.createTemplate();
  // }
  //
  @Delete("/templates/:id/")
  deleteTemplate(@Param("id") id) {
    return this.apiService.deleteTemplate(id);
  }

  //
  // @Get("/templates/group/")
  // getTemplatesGroup() {
  //   return this.apiService.getTemplatesGroup();
  // }

  @Get("/artefacts/")
  async getClasses() {
    return this.apiService.getClasses();
  }

  @UsePipes(new ValidationPipe({ transform: true }))
  @Put("/artefacts/update/")
  @ApiBody({ type: [ArtefactsUpdateDto] })
  async artefactsUpdate(@Body(new ParseArrayPipe({ items: ArtefactsUpdateDto, whitelist: true })) artefacts: ArtefactsUpdateDto[], @Res() response) {
    await this.apiService.artefactsUpdate(artefacts);

    return response.status(HttpStatus.OK).json({ result: true });
  }
}
