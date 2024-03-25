import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { APIPrefix } from 'src/system/common/constants';
import * as KeycloakConnect from "keycloak-connect";
const session = require("express-session")

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.setGlobalPrefix(APIPrefix.Version);

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

  // app.use(keycloak.middleware());
  await app.listen(3000);
}
bootstrap();
