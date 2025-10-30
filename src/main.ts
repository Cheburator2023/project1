/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config({ path: '.env.dev' })

process.env.UV_THREADPOOL_SIZE = '10'

import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { API_PREFIX } from 'src/system/common/constants'
import { GlobalExceptionFilter } from './filters'
import * as express from 'express'
import { AppModule } from './app.module'
import { LoggerService } from './system/logger/logger.service'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    logger: false
  })
  app.use(express.json({ limit: '50mb' }))
  app.use(express.urlencoded({ limit: '50mb', extended: true }))

  const logger = app.get(LoggerService)
  app.useLogger(logger)

  logger.sys('Application starting...')

  app.enableCors()
  app.setGlobalPrefix(API_PREFIX.VERSION)
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true
    })
  )
  app.useGlobalFilters(new GlobalExceptionFilter())

  const config = new DocumentBuilder()
    .setTitle('SUM RM API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Введите JWT токен',
        in: 'header'
      },
      'JWT-auth'
    )
    .build()
  const document = SwaggerModule.createDocument(app, config)

  SwaggerModule.setup('api', app, document)

  app.getHttpAdapter().get('/api-json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.send(document)
  })

  const port = process.env.PORT || 3000
  await app.listen(port)
  logger.sys(`Application started successfully on port ${port}`)
}

bootstrap()
