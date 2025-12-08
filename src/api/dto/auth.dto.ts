import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator'

export class TokenRequestDto {
  @ApiProperty({
    example: 'password',
    description: 'Тип grant_type (только password)',
    default: 'password'
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['password'])
  grant_type: string

  @ApiProperty({
    example: 'frontend',
    description: 'Идентификатор клиента',
    default: 'frontend'
  })
  @IsString()
  @IsNotEmpty()
  client_id: string

  @ApiProperty({
    example: '',
    description: 'Секрет клиента (опционально)',
    required: false,
    default: ''
  })
  @IsOptional()
  @IsString()
  client_secret?: string

  @ApiProperty({
    example: 'test_ds',
    description: 'Имя пользователя',
    default: 'test_ds'
  })
  @IsString()
  @IsNotEmpty()
  username: string

  @ApiProperty({
    example: 'test_ds',
    description: 'Пароль пользователя',
    default: 'test_ds'
  })
  @IsString()
  @IsNotEmpty()
  password: string

  @ApiProperty({
    example: 'openid profile email',
    description: 'Области доступа',
    required: false,
    default: 'openid profile email'
  })
  @IsOptional()
  @IsString()
  scope?: string
}

export class IntrospectRequestDto {
  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUI...',
    description: 'Access token для проверки'
  })
  @IsString()
  @IsNotEmpty()
  token: string

  @ApiProperty({
    example: 'frontend',
    description: 'Идентификатор клиента',
    default: 'frontend'
  })
  @IsString()
  @IsNotEmpty()
  client_id: string

  @ApiProperty({
    example: '',
    description: 'Секрет клиента (опционально)',
    required: false,
    default: ''
  })
  @IsOptional()
  @IsString()
  client_secret?: string
}

export class TokenResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUI...',
    description: 'Access token'
  })
  access_token: string

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUI...',
    description: 'Refresh token'
  })
  refresh_token: string

  @ApiProperty({
    example: 300,
    description: 'Время жизни access token в секундах'
  })
  expires_in: number

  @ApiProperty({
    example: 1800,
    description: 'Время жизни refresh token в секундах'
  })
  refresh_expires_in: number

  @ApiProperty({
    example: 'Bearer',
    description: 'Тип токена'
  })
  token_type: string

  @ApiProperty({
    example: 'openid profile email',
    description: 'Области доступа'
  })
  scope: string
}