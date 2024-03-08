import { DocumentInstance, ServiceEntranceActionArguments } from '@diia-inhouse/types'

export interface CustomActionArguments extends ServiceEntranceActionArguments {
    params: {
        qrCode: string
    }
}

export type ActionResult = DocumentInstance
