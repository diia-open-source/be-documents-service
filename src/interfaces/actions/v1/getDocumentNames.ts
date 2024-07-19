import { ServiceActionArguments } from '@diia-inhouse/types'

import { GetDocumentNamesRequest, GetDocumentNamesResponse } from '@src/generated'

export interface CustomActionArguments extends ServiceActionArguments {
    params: GetDocumentNamesRequest
}

export type ActionResult = GetDocumentNamesResponse
