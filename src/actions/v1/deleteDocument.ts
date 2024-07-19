import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentsService from '@services/documents'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/deleteDocument'

export default class DeleteDocumentAction implements AppAction {
    constructor(private readonly documentsService: DocumentsService) {
        this.validationRules = {
            documentType: { type: 'string', enum: this.documentsService.documentTypes },
            documentId: { type: 'string' },
            force: { type: 'boolean', optional: true, convert: true },
        }
    }

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'deleteDocument'

    readonly validationRules: ValidationSchema

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { documentType, documentId, force },
            session: { user },
            headers: { mobileUid },
        } = args

        const processCode = await this.documentsService.deleteDocument(user, documentType, documentId, mobileUid, force)

        return {
            success: true,
            processCode,
        }
    }
}
