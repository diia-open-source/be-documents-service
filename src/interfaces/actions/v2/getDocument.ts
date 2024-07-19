import { UserActionArguments } from '@diia-inhouse/types'

import { GetDocumentResponse } from '@interfaces/services/documents'

export interface CustomActionArguments extends UserActionArguments {
    params: {
        documentType: string
        documentId: string
    }
}

export type ActionResult = GetDocumentResponse
