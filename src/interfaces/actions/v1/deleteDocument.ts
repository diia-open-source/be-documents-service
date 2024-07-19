import { UserActionArguments } from '@diia-inhouse/types'

export interface CustomActionArguments extends UserActionArguments {
    params: {
        documentType: string
        documentId: string
        force?: boolean
    }
}

export interface ActionResult {
    success: true
    processCode?: number
}
