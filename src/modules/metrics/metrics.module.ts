import { Module } from '@nestjs/common'
import { MetricsService } from './metrics.service'
import { SumDatabaseModule } from 'src/system/sum-database/database.module'
import { MrmDatabaseModule } from 'src/system/mrm-database/database.module'

@Module({
    providers: [MetricsService],
    imports: [SumDatabaseModule, MrmDatabaseModule],
    exports: [MetricsService]
})
export class MetricsModule {
}
