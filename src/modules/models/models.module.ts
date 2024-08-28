import { Module } from '@nestjs/common'
import { ModelsService } from './models.service'
import { SumDatabaseModule } from 'src/system/sum-database/database.module'
import { MrmDatabaseModule } from 'src/system/mrm-database/database.module'

@Module({
    providers: [ModelsService],
    imports: [SumDatabaseModule, MrmDatabaseModule],
    exports: [ModelsService]
})
export class ModelsModule {
}
