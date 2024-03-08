import { DocumentInstance, UserActionArguments } from '@diia-inhouse/types'

export interface CustomActionArguments extends UserActionArguments {
    params: {
        qrCode: string
    }
}

export type ActionResult = DocumentInstance
