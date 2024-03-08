import { AppUserActionHeaders, DocumentInstance, DocumentType, ServiceEntranceActionArguments } from '@diia-inhouse/types'

interface ActionHeaders extends AppUserActionHeaders {
    token: string
}

export interface CustomActionArguments extends ServiceEntranceActionArguments<ActionHeaders> {
    params: {
        documentType: DocumentType
        otp: string
    }
}

export type ActionResult = DocumentInstance
