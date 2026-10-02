import { existsSync, readFileSync } from 'fs'

/**
 * TLS-конфиг для pg.Pool.
 *
 * enabled === false            — подключаемся без TLS (ssl: false).
 * enabled === true, ssl.ca     — полноценный TLS с проверкой сервера
 *                                (и mTLS, если переданы cert/key).
 * enabled === true, !ssl.ca    — обратная совместимость: шифрование без
 *                                проверки сертификата сервера
 *                                (аналог sslmode=require, старое
 *                                `rejectUnauthorized: false`).
 */
export interface PostgresTlsConfig {
  enabled: boolean
  ssl:
    | false
    | {
    rejectUnauthorized: boolean
    ca?: string
    cert?: string
    key?: string
    servername?: string
  }
  source: {
    caLoaded: boolean
    clientCertLoaded: boolean
    clientKeyLoaded: boolean
  }
}

/** Значение переменной — строка "true" (без учёта регистра и пробелов). */
const isTrue = (value: string | undefined): boolean =>
  typeof value === 'string' && value.toLowerCase().trim() === 'true'

/** Значение переменной — строка "false" (без учёта регистра и пробелов). */
const isFalse = (value: string | undefined): boolean =>
  typeof value === 'string' && value.toLowerCase().trim() === 'false'

/**
 * Читает конкретную переменную окружения, возвращая undefined
 * для пустых/отсутствующих значений.
 */
const readEnvVar = (name: string): string | undefined => {
  const value = process.env[name]
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  return value
}

/**
 * Безопасно читает файл сертификата. При отсутствии/ошибке возвращает undefined
 * и пишет предупреждение — приложение продолжает запускаться.
 */
const readCertFileSafe = (
  path: string | undefined,
  label: string
): string | undefined => {
  if (!path) return undefined

  try {
    if (!existsSync(path)) {
      // eslint-disable-next-line no-console
      console.warn(`[TLS] ${label} file not found at path: ${path}`)
      return undefined
    }
    return readFileSync(path, 'utf8')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    // eslint-disable-next-line no-console
    console.warn(`[TLS] Failed to read ${label} from ${path}: ${message}`)
    return undefined
  }
}

/**
 * Собирает TLS-конфиг из переменных окружения приложения.
 *
 * Используемые переменные:
 *  - DB_TLS_ENABLED                 (bool)
 *  - DB_TLS_REJECT_UNAUTHORIZED     (bool, default true)
 *  - DB_TLS_CA_CERT_PATH            (string, путь к CA-сертификату)
 *  - DB_TLS_CLIENT_CERT_PATH        (string, mTLS: клиентский сертификат)
 *  - DB_TLS_CLIENT_KEY_PATH         (string, mTLS: клиентский ключ)
 *  - DB_TLS_SERVERNAME              (string, SNI)
 *
 * Логика:
 *  - DB_TLS_ENABLED !== true        → ssl: false.
 *  - DB_TLS_REJECT_UNAUTHORIZED=true и CA загружен → проверка сервера включена.
 *  - DB_TLS_REJECT_UNAUTHORIZED=true и CA НЕ загружен → fallback на
 *    rejectUnauthorized:false с предупреждением (обратная совместимость).
 *  - DB_TLS_REJECT_UNAUTHORIZED=false → проверка сервера всегда выключена
 *    (шифрование без верификации).
 */
export function buildPostgresTlsConfig(): PostgresTlsConfig {
  const enabled = isTrue(readEnvVar('DB_TLS_ENABLED'))

  if (!enabled) {
    return {
      enabled: false,
      ssl: false,
      source: {
        caLoaded: false,
        clientCertLoaded: false,
        clientKeyLoaded: false
      }
    }
  }

  const caPath = readEnvVar('DB_TLS_CA_CERT_PATH')
  const certPath = readEnvVar('DB_TLS_CLIENT_CERT_PATH')
  const keyPath = readEnvVar('DB_TLS_CLIENT_KEY_PATH')
  const servername = readEnvVar('DB_TLS_SERVERNAME')

  const ca = readCertFileSafe(caPath, 'CA certificate')
  const cert = readCertFileSafe(certPath, 'client certificate')
  const key = readCertFileSafe(keyPath, 'client key')

  // По умолчанию (когда переменная не задана) — проверяем сервер.
  // rejectUnauthorized=false только если переменная явно равна "false".
  const rejectRequested = !isFalse(readEnvVar('DB_TLS_REJECT_UNAUTHORIZED'))

  let rejectUnauthorized: boolean
  if (!rejectRequested) {
    rejectUnauthorized = false
  } else if (ca) {
    rejectUnauthorized = true
  } else {
    // CA не загружен: безопасно проверить сервер невозможно —
    // сохраняем обратную совместимость (шифрование без верификации).
    // eslint-disable-next-line no-console
    console.warn(
      '[TLS] DB_TLS_REJECT_UNAUTHORIZED=true, но CA-сертификат не загружен ' +
      '(DB_TLS_CA_CERT_PATH не задан или файл недоступен). ' +
      'rejectUnauthorized принудительно выставлен в false для обратной совместимости.'
    )
    rejectUnauthorized = false
  }

  const sslOptions: {
    rejectUnauthorized: boolean
    ca?: string
    cert?: string
    key?: string
    servername?: string
  } = { rejectUnauthorized }

  if (ca) sslOptions.ca = ca
  if (cert) sslOptions.cert = cert
  if (key) sslOptions.key = key
  if (servername) sslOptions.servername = servername

  return {
    enabled: true,
    ssl: sslOptions,
    source: {
      caLoaded: Boolean(ca),
      clientCertLoaded: Boolean(cert),
      clientKeyLoaded: Boolean(key)
    }
  }
}