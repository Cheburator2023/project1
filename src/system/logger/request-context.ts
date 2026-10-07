import { Request, Response, NextFunction } from 'express'
import { randomBytes } from 'crypto'

/**
 * Сквозной контекст запроса, используемый для обогащения логов
 * атрибутами агрегационного контекста (раздел 4.5.1.5.1 документа
 * ИС 1404 «Журналирование»).
 *
 * Поля соответствуют атрибутам `agrType=TRACING`, которые передаются
 * в СС Журналирование и Ключ-Астром:
 *  - traceId      — идентификатор запроса (trace ID);
 *  - spanId       — идентификатор операции (span ID);
 *  - parentSpanId — идентификатор родительской операции;
 *  - userId       — идентификатор пользователя;
 *  - requestId    — внутренний идентификатор запроса приложения.
 */
export interface RequestContext {
  traceId?: string
  spanId?: string
  parentSpanId?: string
  userId?: string
  requestId?: string
}

/**
 * Тип Express-middleware, устанавливающего RequestContext.
 */
export type RequestContextMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => void

/**
 * Извлекает значение заголовка как строку (первое значение, если массив).
 */
function getHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string
): string | undefined {
  const value = headers[name]
  if (typeof value === 'string' && value.length > 0) {
    return value
  }
  if (Array.isArray(value) && value.length > 0) {
    return value[0]
  }
  return undefined
}

/**
 * Парсит W3C Trace Context заголовок `traceparent` формата
 * `00-<traceId 32hex>-<spanId 16hex>-<flags 2hex>`.
 */
function parseTraceparent(
  header: string | undefined
): { traceId?: string; spanId?: string } {
  if (!header) return {}
  const parts = header.split('-')
  if (parts.length < 4) return {}
  const traceId =
    parts[1] && /^[a-f0-9]{32}$/i.test(parts[1]) ? parts[1] : undefined
  const spanId =
    parts[2] && /^[a-f0-9]{16}$/i.test(parts[2]) ? parts[2] : undefined
  return { traceId, spanId }
}

/**
 * Парсит заголовок x-dynatrace (формат Ключ-Астром / Dynatrace).
 *
 * Поддерживаются оба формата:
 *  - W3C traceparent, вложенный как значение заголовка;
 *  - проприетарный формат Dynatrace вида
 *    `TAG1;TAG2;...;SN=<spanId>;...;TN=<traceId>;...`,
 *    где SN — span ID, TN — trace ID.
 */
function parseDynatraceHeader(
  header: string | undefined
): { traceId?: string; spanId?: string } {
  if (!header) return {}

  const traceparent = parseTraceparent(header)
  if (traceparent.traceId) {
    return traceparent
  }

  const parts = header.split(';')
  let traceId: string | undefined
  let spanId: string | undefined

  for (const part of parts) {
    const eq = part.indexOf('=')
    if (eq === -1) continue

    const key = part.substring(0, eq).trim()
    const value = part.substring(eq + 1).trim()

    if (key === 'TN' || key === 'traceId') {
      traceId = value
    }
    if (key === 'SN' || key === 'spanId') {
      spanId = value
    }
  }

  return { traceId, spanId }
}

/**
 * Генерирует 32-символьный идентификатор трассировки (W3C trace_id).
 * Используется, когда внешний trace-контекст не пришёл.
 */
function generateTraceId(): string {
  return randomBytes(16).toString('hex')
}

/**
 * Генерирует 16-символьный идентификатор спана (W3C span_id).
 * Используется, когда внешний trace-контекст не пришёл, либо когда
 * входящий запрос имеет trace_id, но не имеет span_id.
 */
function generateSpanId(): string {
  return randomBytes(8).toString('hex')
}

/**
 * Извлекает trace-контекст из заголовков входящего запроса.
 *
 * Приоритет источников:
 *  1. x-dynatrace (Ключ-Астром / Dynatrace).
 *  2. traceparent (W3C Trace Context).
 *  3. x-b3-traceid / x-b3-spanid (Zipkin B3).
 *  4. x-global-transaction-id / x-correlation-id / x-request-id.
 *
 * Гарантируется наличие ОБОИХ полей traceId и spanId. Если внешний
 * контекст не содержит span_id — генерируем свой (аналогично созданию
 * root-span в OpenTelemetry SDK). Без span_id поля dt.trace_id /
 * dt.span_id не отправляются, и лог теряет связь с Ключ-Астром.
 *
 * Формат ID соответствует W3C Trace Context: traceId — 32 hex-символа,
 * spanId — 16 hex-символов.
 */
export function extractRequestContext(req: Request): RequestContext {
  const headers = req.headers as Record<string, string | string[] | undefined>

  const dynatrace = parseDynatraceHeader(getHeader(headers, 'x-dynatrace'))
  const traceparent = parseTraceparent(getHeader(headers, 'traceparent'))

  const b3TraceId = getHeader(headers, 'x-b3-traceid')
  const b3SpanId = getHeader(headers, 'x-b3-spanid')
  const b3ParentSpanId = getHeader(headers, 'x-b3-parentspanid')

  const incomingTraceId =
    dynatrace.traceId ||
    traceparent.traceId ||
    b3TraceId ||
    getHeader(headers, 'x-global-transaction-id') ||
    getHeader(headers, 'x-correlation-id') ||
    getHeader(headers, 'x-request-id')

  const incomingSpanId = dynatrace.spanId || traceparent.spanId || b3SpanId

  const parentSpanId = b3ParentSpanId || undefined
  const requestId = getHeader(headers, 'x-request-id') || undefined

  return {
    traceId: incomingTraceId || generateTraceId(),
    spanId: incomingSpanId || generateSpanId(),
    parentSpanId,
    requestId
  }
}