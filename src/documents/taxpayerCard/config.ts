import { EnvService } from '@diia-inhouse/env'
import { DocumentType, DurationS } from '@diia-inhouse/types'

import { PluginConfig } from '@src/documents/taxpayerCard/interfaces/config'

export default async (envService: EnvService): Promise<PluginConfig> => ({
    [DocumentType.TaxpayerCard]: {
        cardExpirationTimeOnSuccessSec: envService.getVar('TAXPAYER_CARD_EXPIRATION_ON_SUCCESS_SEC', 'number', 10 * DurationS.Day),
        cardExpirationTimeOnConfirmingSec: envService.getVar('TAXPAYER_CARD_EXPIRATION_ON_CONFIRMING_SEC', 'number', DurationS.Hour),
        cardExpirationTimeOnNotConfirmedSec: envService.getVar('TAXPAYER_CARD_EXPIRATION_ON_NOT_CONFIRMED_SEC', 'number', DurationS.Day),
    },
})
