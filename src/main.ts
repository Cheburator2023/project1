/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config({ path: '.env.dev' })

import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { API_PREFIX } from 'src/system/common/constants'

import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors()
  app.setGlobalPrefix(API_PREFIX.VERSION)
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true
    })
  )

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

  await app.listen(3000)
}

bootstrap()
