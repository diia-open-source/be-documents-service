import { ListenerOptions, QueueConfig, QueueConfigType, QueueConnectionConfig, QueueConnectionType } from '@diia-inhouse/diia-queue'
import { EnvService } from '@diia-inhouse/env'

import { mergeConfigs } from '@src/documents/config'

import {
    ExternalEvent,
    ExternalTopic,
    InternalEvent,
    InternalQueueName,
    InternalTopic,
    ScheduledTaskEvent,
    ScheduledTaskQueueName,
} from '@interfaces/queue'

export default function (serviceName: string, envService: EnvService, queuePluginConfig: QueueConnectionConfig): QueueConnectionConfig {
    return <QueueConnectionConfig>mergeConfigs(
        {
            serviceRulesConfig: {
                internalEvents: Object.values(InternalEvent),
                portalEvents: [],
                queuesConfig: {
                    [QueueConfigType.Internal]: {
                        [InternalQueueName.QueueDocuments]: {
                            topics: [InternalTopic.TopicAuthUserSession],
                        },
                        [ScheduledTaskQueueName.ScheduledTasksQueueDocuments]: {
                            topics: [InternalTopic.TopicScheduledTasks],
                        },
                    },
                },
                servicesConfig: {
                    [QueueConfigType.Internal]: {
                        subscribe: [ScheduledTaskQueueName.ScheduledTasksQueueDocuments, InternalQueueName.QueueDocuments],
                        publish: [InternalTopic.TopicDocumentsRegistry],
                    },
                    [QueueConfigType.External]: {
                        subscribe: [],
                        publish: [
                            ExternalEvent.RepoDocumentInternalPassport,
                            ExternalEvent.RepoDocumentForeignPassport,
                            ExternalEvent.RepoDocumentPassports,
                            ExternalEvent.RepoDocumentPassportsByInn,
                        ],
                    },
                },
                topicsConfig: {
                    [QueueConfigType.Internal]: {
                        [InternalTopic.TopicScheduledTasks]: {
                            events: Object.values(ScheduledTaskEvent),
                        },
                        [InternalTopic.TopicAuthUserSession]: {
                            events: [InternalEvent.AuthUserLogOut],
                        },
                        [InternalTopic.TopicDocumentsRegistry]: {
                            events: [
                                InternalEvent.DocumentsAddDocumentsInProfile,
                                InternalEvent.DocumentsAddDocumentInProfile,
                                InternalEvent.DocumentsAddDocumentPhoto,
                                InternalEvent.DocumentsRemoveDocumentPhoto,
                                InternalEvent.DocumentsAdultRegistrationAddressCommunity,
                            ],
                        },
                    },
                    [QueueConfigType.External]: {
                        [ExternalTopic.Repo]: {
                            events: [
                                ExternalEvent.RepoDocumentInternalPassport,
                                ExternalEvent.RepoDocumentForeignPassport,
                                ExternalEvent.RepoDocumentPassports,
                                ExternalEvent.RepoDocumentPassportsByInn,
                            ],
                        },
                    },
                },
            },
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
                queueName: InternalQueueName.QueueDocuments,
                scheduledTaskQueueName: ScheduledTaskQueueName.ScheduledTasksQueueDocuments,
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
        <Record<string, unknown>>queuePluginConfig,
    )
}
