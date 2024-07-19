import { AppUserActionHeaders, UserActionArguments } from '@diia-inhouse/types'

import { TaxpayerCard } from '@src/documents/taxpayerCard/interfaces/services'

interface ActionHeaders extends AppUserActionHeaders {
    token: string
}

export interface CustomActionArguments extends UserActionArguments<ActionHeaders> {
    params: {
        otp: string
    }
}

export type ActionResult = TaxpayerCard
