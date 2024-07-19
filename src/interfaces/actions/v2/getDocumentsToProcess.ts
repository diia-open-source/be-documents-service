import { UserActionArguments } from '@diia-inhouse/types'

import { CommonDocument, Documents, GetDocumentToProcessOptions } from '@interfaces/services/documents'

export interface CustomActionArguments extends UserActionArguments {
    params: {
        documentTypes: string[]
        ignoreCache?: boolean
        queries?: GetDocumentToProcessOptions
    }
}

export type ActionResult = Documents<CommonDocument>
