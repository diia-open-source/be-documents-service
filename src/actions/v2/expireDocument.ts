import { GrpcAppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, DocumentType, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentsExpirationService from '@services/documentsExpiration'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v2/expireDocument'

export default class ExpireDocumentAction implements GrpcAppAction {
    constructor(private readonly documentsExpirationService: DocumentsExpirationService) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V2

    readonly name: string = 'expireDocument'

    readonly validationRules: ValidationSchema = {
        documentType: { type: 'string', enum: Object.values(DocumentType) },
        userIdentifier: { type: 'string' },
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { documentType, userIdentifier },
        } = args

        await this.documentsExpirationService.expireDocumentByType(<DocumentType>documentType, userIdentifier)
    }
}
