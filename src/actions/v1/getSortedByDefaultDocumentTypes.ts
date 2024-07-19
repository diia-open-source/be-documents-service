import { GrpcAppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'

import DocumentsService from '@services/documents'

import { ActionResult } from '@interfaces/actions/v1/getSortedByDefaultDocumentTypes'

export default class GetSortedByDefaultDocumentTypesAction implements GrpcAppAction {
    constructor(private readonly documentsService: DocumentsService) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'getSortedByDefaultDocumentTypes'

    async handler(): Promise<ActionResult> {
        return { sortedDocumentTypes: this.documentsService.getSortedByDefaultDocumentTypes() }
    }
}
