import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import * as os from 'os'

@ApiTags('Мониторинг')
@Controller('monitoring')
export class MonitoringController {
  @ApiOperation({
    summary: 'Получить системную информацию',
    description:
      'Возвращает информацию о состоянии системы: использование памяти, CPU, время работы'
  })
  @ApiResponse({
    status: 200,
    description: 'Системная информация успешно получена'
  })
  @Get('/system')
  async getSystemMonitoring() {
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()
    const totalSystemMemory = os.totalmem()

    // Convert bytes to MB and format with suffixes
    const rssValue = Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100
    const heapTotalValue =
      Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100
    const heapUsedValue =
      Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100
    const externalValue =
      Math.round((memoryUsage.external / 1024 / 1024) * 100) / 100
    const arrayBuffersValue =
      Math.round((memoryUsage.arrayBuffers / 1024 / 1024) * 100) / 100

    const serverMemoryMB = {
      rss: `${rssValue}MB`,
      heapTotal: `${heapTotalValue}MB`,
      heapUsed: `${heapUsedValue}MB`,
      external: `${externalValue}MB`,
      arrayBuffers: `${arrayBuffersValue}MB`
    }

    // Calculate server memory usage percentage relative to total system memory
    const serverMemoryPercentValue =
      Math.round((memoryUsage.rss / totalSystemMemory) * 100 * 100) / 100
    const serverMemoryPercent = `${serverMemoryPercentValue}%`

    // Calculate heap usage percentage
    const heapUsagePercentValue =
      Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100 * 100) /
      100
    const heapUsagePercent = `${heapUsagePercentValue}%`

    // Get available heap memory
    const heapFreeValue =
      Math.round(
        ((memoryUsage.heapTotal - memoryUsage.heapUsed) / 1024 / 1024) * 100
      ) / 100
    const heapFree = `${heapFreeValue}MB`

    // Format total system memory
    const totalSystemMemoryValue =
      Math.round((totalSystemMemory / 1024 / 1024) * 100) / 100
    const totalSystemMemoryMB = `${totalSystemMemoryValue}MB`

    return {
      timestamp: new Date().toISOString(),
      memory: {
        serverUsage: {
          ...serverMemoryMB,
          totalSystemMemory: totalSystemMemoryMB,
          serverMemoryPercent,
          heapUsagePercent,
          heapFree
        }
      },
      cpu: {
        user: `${cpuUsage.user}μs`,
        system: `${cpuUsage.system}μs`
      },
      uptime: {
        seconds: `${Math.round(process.uptime())}s`,
        formatted: this.formatUptime(process.uptime())
      }
    }
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${secs}s`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }
}
