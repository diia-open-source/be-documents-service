import { UserActionArguments } from '@diia-inhouse/types'

import { GetDocumentsToProcessRequest, GetDocumentsToProcessResponse } from '@src/generated'

export interface CustomActionArguments extends UserActionArguments {
    params: GetDocumentsToProcessRequest
}

export type ActionResult = GetDocumentsToProcessResponse
