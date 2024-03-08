import { DocumentType, UserActionArguments } from '@diia-inhouse/types'

import { Document, DocumentsWithOrder } from '@interfaces/services/documents'

export interface CustomActionArguments extends UserActionArguments {
    params: {
        filter?: DocumentType[]
    }
}

export type ActionResult = DocumentsWithOrder<Document>
