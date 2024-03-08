import { AppUserActionHeaders, DocumentType, ServiceEntranceActionArguments } from '@diia-inhouse/types'

import { Document } from '@interfaces/services/documents'

interface ActionHeaders extends AppUserActionHeaders {
    token: string
}

export interface CustomActionArguments extends ServiceEntranceActionArguments<ActionHeaders> {
    params: {
        documentType: DocumentType
        otp: string
    }
}

export type ActionResult = Document
