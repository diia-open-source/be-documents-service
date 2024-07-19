import { UserActionArguments } from '@diia-inhouse/types'

import { CommonDocument, Documents } from '@interfaces/services/documents'

export interface CustomActionArguments extends UserActionArguments {
    params: {
        filter?: string[]
    }
}

export type ActionResult = Documents<CommonDocument>
