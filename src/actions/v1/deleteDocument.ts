import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, DocumentType, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentsService from '@services/documents'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/deleteDocument'

export default class DeleteDocumentAction implements AppAction {
    constructor(private readonly documentsService: DocumentsService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'deleteDocument'

    readonly validationRules: ValidationSchema = {
        documentType: { type: 'string', enum: Object.values(DocumentType) },
        documentId: { type: 'string' },
        force: { type: 'boolean', optional: true, convert: true },
    }

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
