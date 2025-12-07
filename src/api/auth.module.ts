import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { AuthController } from './controllers/auth.controller'
import { AuthService } from './services/auth.service'
import { RateLimitGuard } from './guards/rate-limit.guard'

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, RateLimitGuard],
  exports: [AuthService]
})
export class AuthModule {}