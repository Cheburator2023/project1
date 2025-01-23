import {
  Controller,
  Query,
  Body,
  Param,
  Get,
  Post,
  Put,
  Delete,
  Req,
  Res,
  ParseArrayPipe,
  HttpStatus,
  HttpException
} from "@nestjs/common";
import { Response } from "express";
import { ApiBody } from "@nestjs/swagger";
import { MODEL_SOURCES } from "src/system/common";
import { ApiService } from "./api.service";
import { ModelsService } from "src/modules/models/models.service";
import { ArtefactService } from "src/modules/artefacts/artefact.services";
import { MetricsAggregator } from "src/modules/metrics/aggregators";
import { ReportService } from "src/modules/report/report.service";
import {
  ModelsDto,
  ModelWithRelationsDto,
  CompareModelsDto,
  ModelCreateDto,
  ModelsUpdateDto,
  ModelArtefactHistoryDto,
  TemplateCreateDto,
  TemplateUpdateDto,
  FilterDto,
  MetricsDto
} from "./dto/index.dto";
import { User } from "src/decorators";

@Controller()
export class ApiController {
  constructor(
    private readonly apiService: ApiService,
    private readonly modelsService: ModelsService,
    private readonly metricsAggregator: MetricsAggregator,
    private readonly reportService: ReportService,
    private readonly artefactService: ArtefactService
  ) {
  }

  @Get("/model/relations/")
  async getModelWithRelations(@Query() query: ModelWithRelationsDto, @Res() response) {
    const data = await this.modelsService.getModelWithRelations(query)

    return response.status(HttpStatus.OK).json(data);
  }

  @Get("/models/compare/")
  async compareModels(@Query() query: CompareModelsDto, @Res() response, @Req() req) {
    const data = await this.modelsService.getModelsByDates(query, req.user?.groups)

    return response.status(HttpStatus.OK).json(data);
  }

  @Get("/models/")
  async models(@Query() query: ModelsDto, @Res() response, @Req() req) {
    const result = {
      data: {
        cards: await this.modelsService.getModels(query, req.user?.groups)
      }
    }

    return response.status(HttpStatus.OK).json(result)
  }

  @Post("/model/create/")
  @ApiBody({ type: [ModelCreateDto] })
  async modelCreate(@Body(new ParseArrayPipe({ items: ModelCreateDto, whitelist: true })) artefacts: ModelCreateDto[], @Res() response) {
    const result = await this.modelsService.modelCreate(artefacts);

    return response.status(HttpStatus.CREATED).json(result[0]);
  }

  @Put("/models/update/")
  @ApiBody({ type: [ModelsUpdateDto] })
  async modelsUpdate(@Body(new ParseArrayPipe({ items: ModelsUpdateDto, whitelist: true })) modelsArtefacts: ModelsUpdateDto[], @Res() response, @Req() req) {
    const result = {
      data: {
        cards: await this.modelsService.modelsUpdate(modelsArtefacts, req)
      }
    }

    return response.status(HttpStatus.ACCEPTED).json(result);
  }

  @Get("/model/artefact/history/")
  async getModelHistory(@Query() query: ModelArtefactHistoryDto, @Res() response) {
    const result = await this.apiService.getModelHistory(query);

    return response.status(HttpStatus.ACCEPTED).json(result);
  }

  @Post("/template/create/")
  async createTemplate(@Body() templateCreateDto: TemplateCreateDto, @Res() response, @Req() req) {
    try {
      const createdTemplate = await this.apiService.createTemplate(templateCreateDto, req.user);
      return response.status(HttpStatus.OK).json(createdTemplate[0]);
    } catch (error) {
      if (error.message === "Template name already exists!") {
        throw new HttpException({
          statusCode: HttpStatus.CONFLICT,
          message: "Такое название шаблона уже существует!"
        }, HttpStatus.CONFLICT);
      }

      throw error;
    }
  }

  @Put("/template/update/")
  async updateTemplate(@Body() templateUpdateDto: TemplateUpdateDto, @Res() response, @Req() req) {
    try {
      const updatedTemplate = await this.apiService.updateTemplate(templateUpdateDto, req.user);
      return response.status(HttpStatus.OK).json(updatedTemplate);
    } catch (error) {
      throw new HttpException({
        statusCode: HttpStatus.CONFLICT,
        message: error.message
      }, HttpStatus.CONFLICT);
    }
  }

  @Get("/templates/")
  async getTemplates(@Res() response, @Req() req) {
    const result = await this.apiService.getTemplates(req.user);

    return response.status(HttpStatus.ACCEPTED).json(result);
  }

  @Get("/template/:id/")
  async getTemplate(@Param("id") id: number, @Res() response, @Req() req) {
    const result = await this.apiService.getTemplate(id, req.user);

    if (result.length) {
      return response.status(HttpStatus.OK).json(result[0]);
    } else {
      response.status(HttpStatus.NOT_FOUND).json([]);
    }
  }

  @Delete("/template/delete/:id/")
  async deleteTemplate(@Param("id") id: number, @Res() response) {
    await this.apiService.deleteTemplate(id);

    return response.status(HttpStatus.ACCEPTED).json({ result: true });
  }

  @Get("/artefacts/")
  async getArtefacts(@Res() response, @User() user) {
    const result = await this.artefactService.getArtefacts(MODEL_SOURCES.MRM, user);
    return response.status(HttpStatus.OK).json(result)
  }

  @Get('/metrics/')
  async getMetrics(@Query() query: MetricsDto, @Res() response) {
    const { startDate, endDate, stream } = query;
    const result = await this.metricsAggregator.getMetrics(
      startDate,
      endDate,
      stream,
    );
    return response.status(HttpStatus.OK).json(result);
  }

  @Post("report")
  async getReport(@Body() { filters }: FilterDto, @Res() res: Response, @Req() req) {
    const response = await this.reportService.getReport(filters, req.user?.groups);

    res.setHeader("Content-Disposition", "attachment; filename=report.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(response);
  }
}
