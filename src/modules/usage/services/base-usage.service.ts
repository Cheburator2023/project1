import { Logger } from '@nestjs/common'
import { IUsageService } from '../interfaces'
import { UpdateUsageDto } from '../dto'


export abstract class BaseUsageService implements IUsageService {
  protected abstract logger: Logger

  protected constructor(
    public readonly databaseService,
    public readonly modelService,
  ) {
  }

  handleUpdateUsage(data: UpdateUsageDto): Promise<boolean> {
    return Promise.resolve(true)
  }

  normalizeToLocalDate(date: string | Date): string {
    const localDate = new Date(date)
    return `${ localDate.getFullYear() }-${ String(localDate.getMonth() + 1).padStart(2, '0') }-${ String(localDate.getDate()).padStart(2, '0') }`
  }
}


