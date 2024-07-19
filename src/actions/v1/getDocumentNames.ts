import { GrpcAppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'

import DocumentsService from '@services/documents'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/getDocumentNames'

export default class GetDocumentNamesAction implements GrpcAppAction {
    constructor(private readonly documentsService: DocumentsService) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'getDocumentNames'

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { documentTypes },
        } = args

        return { documentTypeToName: this.documentsService.getDocumentNames(documentTypes) }
    }
}
