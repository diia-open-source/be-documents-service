import { mongo } from '@diia-inhouse/db'
import { ServiceActionArguments } from '@diia-inhouse/types'

import { Document } from '@interfaces/services/documents'

export interface CustomActionArguments extends ServiceActionArguments {
    params: {
        documentType: string
        barcode: string
        branchId: mongo.ObjectId
    }
}

export type ActionResult = Document
