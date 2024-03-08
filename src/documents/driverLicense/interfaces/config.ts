import { DocumentType } from '@diia-inhouse/types'

export interface PluginConfig {
    [DocumentType.DriverLicense]: {
        providerIsEnabled: boolean
        returnExpired: boolean
    }
}
