import { ServiceActionArguments } from '@diia-inhouse/types'

import { GetValidatedVerificationRecordResult } from '@interfaces/services/documentVerification'

export interface CustomActionArguments extends ServiceActionArguments {
    params: {
        barcode?: string
        otp?: string
    }
}

export type ActionResult = GetValidatedVerificationRecordResult
