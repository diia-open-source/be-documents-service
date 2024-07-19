import { QueueConnectionConfig } from '@diia-inhouse/diia-queue'

import { DocumentType } from '@src/documents/driverLicense/interfaces/services'

export interface PluginConfig {
    [DocumentType.DriverLicense]: {
        providerIsEnabled: boolean
        returnExpired: boolean
    }
    queueConfig: QueueConnectionConfig
}

export enum ExternalEvent {
    RepoDocumentDriverLicense = 'document.driver-license',
}
