import { DocumentType, UserActionArguments } from '@diia-inhouse/types'

import { CommonDocument, Documents } from '@interfaces/services/documents'

export interface CustomActionArguments extends UserActionArguments {
    params: {
        filter?: DocumentType[]
    }
}

export type ActionResult = Documents<CommonDocument>
