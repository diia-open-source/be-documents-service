import { ServiceActionArguments } from '@diia-inhouse/types'

import { CommonDocument, Documents } from '@interfaces/services/documents'

export interface CustomActionArguments extends ServiceActionArguments {
    params: {
        itn: string
        documentTypes: string[]
        ignoreCache?: boolean
    }
}

export type ActionResult = Documents<CommonDocument>
