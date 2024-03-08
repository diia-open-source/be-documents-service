import { DocumentType, ServiceActionArguments } from '@diia-inhouse/types'

import { Document } from '@interfaces/services/documents'

export interface CustomActionArguments extends ServiceActionArguments {
    params: {
        documentType: DocumentType
        barcode: string
    }
}

export type ActionResult = Document
