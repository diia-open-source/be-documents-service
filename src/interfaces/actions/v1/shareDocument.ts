import { UserActionArguments } from '@diia-inhouse/types'

import { ShareDocumentReq, ShareDocumentResV1 } from '@src/generated'

export interface CustomActionArguments extends UserActionArguments {
    params: ShareDocumentReq
}

export type ActionResult = ShareDocumentResV1
