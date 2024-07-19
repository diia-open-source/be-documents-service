import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentsService from '@services/documents'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/getDocuments'

export default class GetDocumentsAction implements AppAction {
    constructor(private readonly documentsService: DocumentsService) {
        this.validationRules = {
            filter: {
                type: 'array',
                items: { type: 'string', enum: this.documentsService.documentTypes },
                optional: true,
            },
        }
    }

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'getDocuments'

    readonly validationRules: ValidationSchema

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            session,
            params: { filter = [...this.documentsService.documentTypes] },
            headers,
        } = args

        return await this.documentsService.getDocuments(session, filter, headers)
    }
}
