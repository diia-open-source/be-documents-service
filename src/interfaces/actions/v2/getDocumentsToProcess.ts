import { DocumentType, Documents, UserActionArguments } from '@diia-inhouse/types'

import { GetDocumentToProcessOptions } from '@interfaces/services/documents'

export interface CustomActionArguments extends UserActionArguments {
    params: {
        documentTypes: DocumentType[]
        ignoreCache?: boolean
        queries?: GetDocumentToProcessOptions
    }
}

export type ActionResult = Documents
