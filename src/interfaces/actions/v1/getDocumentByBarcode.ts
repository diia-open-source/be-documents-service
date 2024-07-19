import { ServiceActionArguments } from '@diia-inhouse/types'

import { Document } from '@interfaces/services/documents'

export interface CustomActionArguments extends ServiceActionArguments {
    params: {
        documentType: string
        barcode: string
    }
}

export type ActionResult = Document
