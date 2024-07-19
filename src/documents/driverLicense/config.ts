import { QueueConfigType } from '@diia-inhouse/diia-queue'
import { EnvService } from '@diia-inhouse/env'

import { ExternalEvent, PluginConfig } from '@src/documents/driverLicense/interfaces/config'
import { DocumentType } from '@src/documents/driverLicense/interfaces/services'

import { ExternalTopic } from '@interfaces/queue'

export default async (envService: EnvService): Promise<PluginConfig> => ({
    [DocumentType.DriverLicense]: {
        providerIsEnabled: envService.getVar('HSC_IS_ENABLED', 'boolean', false),
        returnExpired: envService.getVar('HSC_RETURN_EXPIRED', 'boolean', true),
    },
    queueConfig: {
        serviceRulesConfig: {
            servicesConfig: {
                [QueueConfigType.Internal]: {},
                [QueueConfigType.External]: {
                    publish: [ExternalEvent.RepoDocumentDriverLicense],
                    subscribe: [],
                },
            },
            topicsConfig: {
                [QueueConfigType.Internal]: {},
                [QueueConfigType.External]: {
                    [ExternalTopic.Repo]: {
                        events: [ExternalEvent.RepoDocumentDriverLicense],
                    },
                },
            },
            queuesConfig: {
                [QueueConfigType.Internal]: {},
            },
            portalEvents: [],
            internalEvents: [],
        },
    },
})
