/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config({ path: '.env.dev' })

import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { API_PREFIX } from 'src/system/common/constants'
import { GlobalExceptionFilter } from './filters'
import * as express from 'express'

import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.use(express.json({ limit: '50mb' }))
  app.use(express.urlencoded({ limit: '50mb', extended: true }))
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
    .build()
  const document = SwaggerModule.createDocument(app, config)

  SwaggerModule.setup('api', app, document)

  app.getHttpAdapter().get('/api-json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.send(document)
  })

  const port = process.env.PORT || 3000
  await app.listen(port)
  console.log(`🚀 Application is running on: http://localhost:${port}`)
}

bootstrap()
