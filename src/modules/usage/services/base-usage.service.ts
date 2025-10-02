import { LoggerService } from 'src/system/logger/logger.service'
import { IUsageService } from '../interfaces'
import { UpdateUsageDto } from '../dto'

export abstract class BaseUsageService implements IUsageService {
  protected constructor(
    public readonly databaseService,
    public readonly modelService,
    protected readonly logger: LoggerService
  ) {}

  handleUpdateUsage(data: UpdateUsageDto): Promise<boolean> {
    return Promise.resolve(true)
  }

  normalizeToLocalDate(date: string | Date): string {
    const localDate = new Date(date)
    return `${ localDate.getFullYear() }-${ String(localDate.getMonth() + 1).padStart(2, '0') }-${ String(localDate.getDate()).padStart(2, '0') }`
  }
}
