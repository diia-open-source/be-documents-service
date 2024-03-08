import { DocumentType, UserActionArguments } from '@diia-inhouse/types'

export interface CustomActionArguments extends UserActionArguments {
    params: {
        documentType: DocumentType
    }
}

export type ActionResult = void
