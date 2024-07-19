import { BalancingStrategy, MetricsConfig, TransporterConfig } from '@diia-inhouse/diia-app'

import { AuthConfig, IdentifierConfig } from '@diia-inhouse/crypto'
import { AppDbConfig, ReplicaSetNodeConfig } from '@diia-inhouse/db'
import { QueueConnectionConfig } from '@diia-inhouse/diia-queue'
import { EnvService } from '@diia-inhouse/env'
import { HealthCheckConfig } from '@diia-inhouse/healthcheck'
import { RedisConfig } from '@diia-inhouse/redis'
import { DurationMs, DurationS } from '@diia-inhouse/types'

import { getConfigs as getPluginConfigs } from '@src/documents/config'
import getQueueConfig from '@src/queueConfig'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async (envService: EnvService, serviceName: string) => {
    const { queueConfig: queuePluginConfig, ...genericPluginConfigs } = await getPluginConfigs(envService, serviceName)

    return {
        isMoleculerEnabled: true,
        transporter: <TransporterConfig>{
            type: envService.getVar('TRANSPORT_TYPE'),
            options: envService.getVar('TRANSPORT_OPTIONS', 'object', {}),
        },

        balancing: <BalancingStrategy>{
            strategy: process.env.BALANCING_STRATEGY_NAME,
            strategyOptions: envService.getVar('BALANCING_STRATEGY_OPTIONS', 'object', {}),
        },

        db: <AppDbConfig>{
            database: process.env.MONGO_DATABASE,
            replicaSet: process.env.MONGO_REPLICA_SET,
            user: await envService.getSecret('MONGO_USER', { accessor: 'username', nullable: true }),
            password: await envService.getSecret('MONGO_PASSWORD', { accessor: 'password', nullable: true }),
            authSource: process.env.MONGO_AUTH_SOURCE,
            port: envService.getVar('MONGO_PORT', 'number'),
            replicaSetNodes: envService
                .getVar('MONGO_HOSTS', 'string')
                .split(',')
                .map((replicaHost: string): ReplicaSetNodeConfig => ({ replicaHost })),
            readPreference: process.env.MONGO_READ_PREFERENCE,
            indexes: {
                sync: process.env.MONGO_INDEXES_SYNC === 'true',
                exitAfterSync: process.env.MONGO_INDEXES_EXIT_AFTER_SYNC === 'true',
            },
        },

        redis: <RedisConfig>{
            readWrite: envService.getVar('REDIS_READ_WRITE_OPTIONS', 'object'),
            readOnly: envService.getVar('REDIS_READ_ONLY_OPTIONS', 'object'),
        },

        store: <RedisConfig>{
            readWrite: envService.getVar('STORE_READ_WRITE_OPTIONS', 'object'),
            readOnly: envService.getVar('STORE_READ_ONLY_OPTIONS', 'object'),
        },

        rabbit: getQueueConfig(serviceName, envService, <QueueConnectionConfig>queuePluginConfig),

        healthCheck: <HealthCheckConfig>{
            isEnabled: envService.getVar('HEALTH_CHECK_IS_ENABLED', 'boolean'),
            port: envService.getVar('HEALTH_CHECK_IS_PORT', 'number', 3000),
        },

        metrics: <MetricsConfig>{
            moleculer: {
                prometheus: {
                    isEnabled: envService.getVar('METRICS_MOLECULER_PROMETHEUS_IS_ENABLED', 'boolean', true),
                    port: envService.getVar('METRICS_MOLECULER_PROMETHEUS_PORT', 'number', 3031),
                    path: envService.getVar('METRICS_MOLECULER_PROMETHEUS_PATH', 'string', '/metrics'),
                },
            },
            custom: {
                disabled: envService.getVar('METRICS_CUSTOM_DISABLED', 'boolean', false),
                port: envService.getVar('METRICS_CUSTOM_PORT', 'number', 3030),
                moleculer: {
                    disabled: envService.getVar('METRICS_CUSTOM_MOLECULER_DISABLED', 'boolean', false),
                    port: envService.getVar('METRICS_CUSTOM_MOLECULER_PORT', 'number', 3031),
                    path: envService.getVar('METRICS_CUSTOM_MOLECULER_PATH', 'string', '/metrics'),
                },
                disableDefaultMetrics: envService.getVar('METRICS_CUSTOM_DISABLE_DEFAULT_METRICS', 'boolean', false),
                defaultLabels: envService.getVar('METRICS_CUSTOM_DEFAULT_LABELS', 'object', {}),
                responseTimingBuckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.2, 0.5, 0.7, 1, 5, 10, 15, 20, 30, 40],
                requestTimingBuckets: [0.01, 0.05, 0.1, 0.2, 0.5, 0.7, 1, 5, 10, 20, 40, 60],
            },
        },

        identifier: <IdentifierConfig>{
            salt: process.env.SALT,
        },

        hashBytes: envService.getVar('HASH_BYTES', 'number', 10),

        app: {
            integrationPointsTimeout: envService.getVar('INTEGRATION_TIMEOUT_IN_MSEC', 'number', 10 * DurationMs.Second),
            dateFormat: 'DD.MM.YYYY',
            dateLocale: 'uk',
            isDocumentsExpirationEnabled: envService.getVar('IS_DOCUMENTS_EXPIRATION_ENABLED', 'boolean', false),
            documentVerificationLinkExpirationMS: DurationMs.Minute * 3,
            defaultDocumentExpirationTime: envService.getVar('DEFAULT_DOCUMENTS_EXPIRATION_TIME', 'number', DurationS.Hour),
            mock: {
                userIdentifiers: envService.getVar('MOCK_USER_IDENTIFIERS', 'object', []),
            },
        },

        auth: <AuthConfig>{
            jwk: process.env.JWE_SECRET_DATA_JWK,
            jwt: {
                tokenVerifyOptions: {
                    algorithms: ['RS256'],
                    ignoreExpiration: false,
                },
            },
        },

        eis: {
            isEnabled: envService.getVar('EIS_IS_ENABLED', 'boolean', false),
            addressInStructure: envService.getVar('EIS_ADDRESS_IN_STRUCTURE', 'boolean', true),
            returnExpired: envService.getVar('EIS_RETURN_EXPIRED', 'boolean', true),
        },

        dms: {
            isEnabled: envService.getVar('DMS_IS_ENABLED', 'boolean', true),
        },

        returnItnDataIsEnabled: envService.getVar('RETURN_ITN_DATA_IS_ENABLED', 'boolean', false),

        grpc: {
            isEnabled: envService.getVar('GRPC_CLIENT_ENABLED', 'boolean', false),
            govGateway: envService.getVar('GRPC_GOV_GATEWAY', 'string', 'gov-gateway-grpc:5000'),
            userServiceAddress: envService.getVar('GRPC_USER_SERVICE_ADDRESS', 'string'),
        },

        grpcServer: {
            isEnabled: envService.getVar('GRPC_SERVER_ENABLED', 'boolean', false),
            port: envService.getVar('GRPC_SERVER_PORT', 'number', 5000),
            services: envService.getVar('GRPC_SERVICES', 'object', []),
            isReflectionEnabled: envService.getVar('GRPC_REFLECTION_ENABLED', 'boolean', false),
            maxReceiveMessageLength: envService.getVar('GRPC_SERVER_MAX_RECEIVE_MESSAGE_LENGTH', 'number', 1024 * 1024 * 4),
        },

        archive: {
            docsPerIteration: envService.getVar('ARCHIVE_DOCUMENTS_PER_ITERATION', 'number', 100),
        },

        ...genericPluginConfigs,
    }
}
