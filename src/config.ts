import { BalancingStrategy, MetricsConfig, TransporterConfig } from '@diia-inhouse/diia-app'

import { AuthConfig, IdentifierConfig } from '@diia-inhouse/crypto'
import { AppDbConfig, ReplicaSetNodeConfig } from '@diia-inhouse/db'
import { ListenerOptions, QueueConfig, QueueConnectionConfig, QueueConnectionType } from '@diia-inhouse/diia-queue'
import { EnvService } from '@diia-inhouse/env'
import { HealthCheckConfig } from '@diia-inhouse/healthcheck'
import { RedisConfig } from '@diia-inhouse/redis'
import { DurationMs, DurationS } from '@diia-inhouse/types'

import { getConfigs as getPluginConfigs } from '@src/documents/config'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async (envService: EnvService, serviceName: string) => {
    const [mongoUser, mongoPassword, pluginConfigs] = await Promise.all([
        envService.getSecret('MONGO_USER', 'username'),
        envService.getSecret('MONGO_PASSWORD', 'password'),
        getPluginConfigs(envService, serviceName),
    ])

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
            user: mongoUser,
            password: mongoPassword,
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

        rabbit: <QueueConnectionConfig>{
            [QueueConnectionType.Internal]: <QueueConfig>{
                connection: {
                    hostname: process.env.RABBIT_HOST,
                    port: process.env.RABBIT_PORT ? envService.getVar('RABBIT_PORT', 'number') : undefined,
                    username: process.env.RABBIT_USERNAME,
                    password: process.env.RABBIT_PASSWORD,
                    heartbeat: process.env.RABBIT_HEARTBEAT ? envService.getVar('RABBIT_HEARTBEAT', 'number') : undefined,
                },
                socketOptions: {
                    clientProperties: {
                        applicationName: `${serviceName} Service`,
                    },
                },
                reconnectOptions: {
                    reconnectEnabled: true,
                },
                listenerOptions: <ListenerOptions>{
                    prefetchCount: envService.getVar('RABBIT_QUEUE_PREFETCH_COUNT', 'number', 10),
                },
            },
            [QueueConnectionType.External]: <QueueConfig>{
                connection: {
                    hostname: process.env.EXTERNAL_RABBIT_HOST,
                    port: process.env.EXTERNAL_RABBIT_PORT ? envService.getVar('EXTERNAL_RABBIT_PORT', 'number') : undefined,
                    username: process.env.EXTERNAL_RABBIT_USERNAME,
                    password: process.env.EXTERNAL_RABBIT_PASSWORD,
                    heartbeat: process.env.EXTERNAL_RABBIT_HEARTBEAT ? envService.getVar('EXTERNAL_RABBIT_HEARTBEAT', 'number') : undefined,
                },
                socketOptions: {
                    clientProperties: {
                        applicationName: `${serviceName} Service`,
                    },
                },
                reconnectOptions: {
                    reconnectEnabled: true,
                },
                listenerOptions: <ListenerOptions>{
                    prefetchCount: envService.getVar('EXTERNAL_RABBIT_QUEUE_PREFETCH_COUNT', 'number', 1),
                },
                assertExchanges: envService.getVar('EXTERNAL_RABBIT_ASSERT_EXCHANGES', 'boolean', false),
                custom: {
                    responseRoutingKeyPrefix: process.env.EXTERNAL_RABBIT_RESPONSE_ROUTING_KEY_PREFIX,
                },
            },
        },

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
        },

        archive: {
            docsPerIteration: envService.getVar('ARCHIVE_DOCUMENTS_PER_ITERATION', 'number', 100),
        },

        ...pluginConfigs,
    }
}
