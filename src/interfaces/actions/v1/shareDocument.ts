import { UserActionArguments } from '@diia-inhouse/types'

import { ShareDocumentReq, ShareDocumentRes } from '@src/generated'

export interface CustomActionArguments extends UserActionArguments {
    params: ShareDocumentReq
}

export type ActionResult = ShareDocumentRes
