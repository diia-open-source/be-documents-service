import { UserActionArguments } from '@diia-inhouse/types'

import { Document, DocumentsWithOrder } from '@interfaces/services/documents'

export interface CustomActionArguments extends UserActionArguments {
    params: {
        filter: string[]
    }
}

export type ActionResult = DocumentsWithOrder<Document>
