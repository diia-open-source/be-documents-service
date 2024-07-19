import { ServiceEntranceActionArguments } from '@diia-inhouse/types'

import { DocumentInstance } from '@interfaces/services'

export interface CustomActionArguments extends ServiceEntranceActionArguments {
    params: {
        qrCode: string
    }
}

export type ActionResult = DocumentInstance
