import { QueueConnectionConfig } from '@diia-inhouse/diia-queue'

import { DocumentType } from '@src/documents/taxpayerCard/interfaces/services'

export interface PluginConfig {
    [DocumentType.TaxpayerCard]: {
        cardExpirationTimeOnSuccessSec: number
        cardExpirationTimeOnConfirmingSec: number
        cardExpirationTimeOnNotConfirmedSec: number
    }
    queueConfig: QueueConnectionConfig
}

export enum ExternalEvent {
    RepoDocumentRnokpp = 'document.rnokpp',
    RepoDocumentTaxpayerCard = 'document.taxpayer-card',
}
