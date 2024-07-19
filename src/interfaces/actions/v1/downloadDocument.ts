import { UserActionArguments } from '@diia-inhouse/types'

import { DocumentDownloadParams, DocumentDownloadResponse } from '@interfaces/services/documents'

export interface CustomActionArguments extends UserActionArguments {
    params: DocumentDownloadParams<string>
}

export type ActionResult = DocumentDownloadResponse
