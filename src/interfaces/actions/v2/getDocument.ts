import { DocumentType, UserActionArguments } from '@diia-inhouse/types'

import { GetDocumentResponse } from '@interfaces/services/documents'

export interface CustomActionArguments extends UserActionArguments {
    params: {
        documentType: DocumentType
        documentId: string
    }
}

export type ActionResult = GetDocumentResponse
