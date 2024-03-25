import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SumDatabaseModule } from 'src/system/sum-database/database.module';
import { MrmDatabaseModule } from 'src/system/mrm-database/database.module';
import { ApiModule } from 'src/api/api.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    SumDatabaseModule,
    MrmDatabaseModule,
    ApiModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
