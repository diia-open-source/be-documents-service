import { DocumentType } from '@diia-inhouse/types'

export interface PluginConfig {
    [DocumentType.TaxpayerCard]: {
        cardExpirationTimeOnSuccessSec: number
        cardExpirationTimeOnConfirmingSec: number
        cardExpirationTimeOnNotConfirmedSec: number
    }
}
