import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { KeycloakService } from './keycloak.service'

@Module({
  imports: [HttpModule],
  providers: [KeycloakService],
  exports: [KeycloakService]
})
export class KeycloakModule {}
