import { GrpcAppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'

import DocumentsService from '@services/documents'

import { ActionResult } from '@interfaces/actions/v1/getDocumentTypes'

export default class GetDocumentTypesAction implements GrpcAppAction {
    constructor(private readonly documentsService: DocumentsService) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'getDocumentTypes'

    async handler(): Promise<ActionResult> {
        return { documentTypes: this.documentsService.documentTypes }
    }
}
