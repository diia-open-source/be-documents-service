import { UserActionArguments } from '@diia-inhouse/types'

import { VerificationResponse } from '@interfaces/services/documentVerification'

export interface CustomActionArguments extends UserActionArguments {
    params: {
        qrCode: string
    }
}

export type ActionResult = VerificationResponse
