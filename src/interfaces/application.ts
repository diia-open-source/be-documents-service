import { GrpcService } from '@diia-inhouse/diia-app'

import { AnalyticsService } from '@diia-inhouse/analytics'
import { CryptoDeps } from '@diia-inhouse/crypto'
import { DatabaseService } from '@diia-inhouse/db'
import { QueueDeps } from '@diia-inhouse/diia-queue'
import { HealthCheck } from '@diia-inhouse/healthcheck'
import { HttpDeps } from '@diia-inhouse/http'
import { I18nService } from '@diia-inhouse/i18n'
import { RedisDeps } from '@diia-inhouse/redis'

import Utils from '@utils/index'

import { AppConfig } from '@interfaces/config'
import { ProvidersDeps } from '@interfaces/providers'

export type InternalDeps = {
    appUtils: Utils
}

export type AppDeps = {
    config: AppConfig
    healthCheck: HealthCheck
    database: DatabaseService
    analytics: AnalyticsService
    i18n: I18nService
    grpcService: GrpcService
} & InternalDeps &
    ProvidersDeps &
    QueueDeps &
    RedisDeps &
    CryptoDeps &
    HttpDeps
