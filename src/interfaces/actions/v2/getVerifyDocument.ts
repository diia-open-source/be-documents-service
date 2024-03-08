import { AppUserActionHeaders, DocumentInstance, DocumentType, UserActionArguments } from '@diia-inhouse/types'

interface ActionHeaders extends AppUserActionHeaders {
    token: string
}

export interface CustomActionArguments extends UserActionArguments<ActionHeaders> {
    params: {
        otp: string
        documentType: DocumentType
    }
}

export type ActionResult = DocumentInstance
