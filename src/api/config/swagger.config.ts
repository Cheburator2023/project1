import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { INestApplication } from '@nestjs/common'

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('SUM RM API')
    .setDescription('API для системы управления отчетами SUM RM')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Введите JWT токен полученный из /auth/token'
      },
      'JWT-auth'
    )
    .build()

  const document = SwaggerModule.createDocument(app, config)

  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      security: [{
        'JWT-auth': []
      }],
      authAction: {
        'JWT-auth': {
          name: 'JWT-auth',
          schema: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          },
          value: 'Bearer '
        }
      }
    }
  })
}