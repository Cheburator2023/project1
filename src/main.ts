require('dotenv').config({ path: '.env.dev' });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { API_PREFIX } from 'src/system/common/constants';
import * as KeycloakConnect from 'keycloak-connect';

import { AppModule } from './app.module';
import { LoggerService } from './system/logger/logger.service';

const session = require('express-session');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Initialize logger
  const logger = app.get(LoggerService);
  logger.sys('Application starting...');

  app.enableCors();
  app.setGlobalPrefix(API_PREFIX.VERSION);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('API Example')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);

  const kcConfig = {
    'confidential-port': 0,
    realm: process.env.KEYCLOAK_REALMS,
    'auth-server-url': `${process.env.KEYCLOAK_URL}`,
    'ssl-required': 'none',
    resource: process.env.KEYCLOAK_CLIENT,
    'bearer-only': true,
  };

  const memoryStore = new session.MemoryStore();
  const keycloak = new KeycloakConnect({ store: memoryStore }, kcConfig);

  app.use(keycloak.middleware());

  await app.listen(3000);

  logger.sys('Application started successfully on port 3000');
}

bootstrap();
