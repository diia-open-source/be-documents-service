import { AppUserActionHeaders, UserActionArguments } from '@diia-inhouse/types'

import { DocumentInstance } from '@interfaces/services'

interface ActionHeaders extends AppUserActionHeaders {
    token: string
}

export interface CustomActionArguments extends UserActionArguments<ActionHeaders> {
    params: {
        otp: string
        documentType: string
    }
}

export type ActionResult = DocumentInstance
