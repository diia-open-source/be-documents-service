import { UserActionArguments } from '@diia-inhouse/types'

import { DocumentsResponse, GetDocumentsRequest } from '@interfaces/services/documents'

export interface CustomActionArguments extends UserActionArguments {
    params: GetDocumentsRequest
}

export type ActionResult = DocumentsResponse
