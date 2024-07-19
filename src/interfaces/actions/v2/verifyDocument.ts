import { UserActionArguments } from '@diia-inhouse/types'

import { DocumentInstance } from '@interfaces/services'

export interface CustomActionArguments extends UserActionArguments {
    params: {
        qrCode: string
    }
}

export type ActionResult = DocumentInstance
