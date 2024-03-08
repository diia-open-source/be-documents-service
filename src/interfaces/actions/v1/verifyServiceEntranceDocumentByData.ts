import { ServiceEntranceActionArguments } from '@diia-inhouse/types'

import { VerificationResponse } from '@interfaces/services/documentVerification'

export interface CustomActionArguments extends ServiceEntranceActionArguments {
    params: {
        qrCode: string
    }
}

export type ActionResult = VerificationResponse
