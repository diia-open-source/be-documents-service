import { AppUserActionHeaders, ServiceEntranceActionArguments } from '@diia-inhouse/types'

import { DocumentInstance } from '@interfaces/services'

interface ActionHeaders extends AppUserActionHeaders {
    token: string
}

export interface CustomActionArguments extends ServiceEntranceActionArguments<ActionHeaders> {
    params: {
        documentType: string
        otp: string
    }
}

export type ActionResult = DocumentInstance
