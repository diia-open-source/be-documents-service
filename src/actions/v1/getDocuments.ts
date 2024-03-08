import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, DocumentType, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentsService from '@services/documents'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/getDocuments'

export default class GetDocumentsAction implements AppAction {
    constructor(private readonly documentsService: DocumentsService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'getDocuments'

    readonly validationRules: ValidationSchema = {
        filter: {
            type: 'array',
            items: { type: 'string', enum: Object.values(DocumentType) },
            optional: true,
        },
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            session,
            params: { filter = Object.values(DocumentType) },
            headers,
        } = args

        return await this.documentsService.getDocuments(session, filter, headers)
    }
}
