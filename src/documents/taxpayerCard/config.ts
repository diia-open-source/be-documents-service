import { QueueConfigType } from '@diia-inhouse/diia-queue'
import { EnvService } from '@diia-inhouse/env'
import { DurationS } from '@diia-inhouse/types'

import { ExternalEvent, PluginConfig } from '@src/documents/taxpayerCard/interfaces/config'
import { DocumentType } from '@src/documents/taxpayerCard/interfaces/services'

import { ExternalTopic } from '@interfaces/queue'

export default async (envService: EnvService): Promise<PluginConfig> => ({
    [DocumentType.TaxpayerCard]: {
        cardExpirationTimeOnSuccessSec: envService.getVar('TAXPAYER_CARD_EXPIRATION_ON_SUCCESS_SEC', 'number', 10 * DurationS.Day),
        cardExpirationTimeOnConfirmingSec: envService.getVar('TAXPAYER_CARD_EXPIRATION_ON_CONFIRMING_SEC', 'number', DurationS.Hour),
        cardExpirationTimeOnNotConfirmedSec: envService.getVar('TAXPAYER_CARD_EXPIRATION_ON_NOT_CONFIRMED_SEC', 'number', DurationS.Day),
    },
    queueConfig: {
        serviceRulesConfig: {
            servicesConfig: {
                [QueueConfigType.Internal]: {},
                [QueueConfigType.External]: {
                    publish: [ExternalEvent.RepoDocumentRnokpp, ExternalEvent.RepoDocumentTaxpayerCard],
                    subscribe: [],
                },
            },
            topicsConfig: {
                [QueueConfigType.Internal]: {},
                [QueueConfigType.External]: {
                    [ExternalTopic.Repo]: {
                        events: [ExternalEvent.RepoDocumentRnokpp, ExternalEvent.RepoDocumentTaxpayerCard],
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
