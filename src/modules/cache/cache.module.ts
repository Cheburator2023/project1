import { Module, Global } from '@nestjs/common'
import { CacheFactoryService } from './cache-factory.service'

@Global()
@Module({
  providers: [CacheFactoryService],
  exports: [CacheFactoryService]
})
export class CacheModule {}
