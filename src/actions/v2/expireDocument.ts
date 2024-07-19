import { GrpcAppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentsService from '@services/documents'
import DocumentsExpirationService from '@services/documentsExpiration'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v2/expireDocument'

export default class ExpireDocumentAction implements GrpcAppAction {
    constructor(
        private readonly documentsService: DocumentsService,
        private readonly documentsExpirationService: DocumentsExpirationService,
    ) {
        this.validationRules = {
            documentType: { type: 'string', enum: this.documentsService.documentTypes },
            userIdentifier: { type: 'string' },
        }
    }

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V2

    readonly name: string = 'expireDocument'

    readonly validationRules: ValidationSchema

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { documentType, userIdentifier },
        } = args

        await this.documentsExpirationService.expireDocumentByType(documentType, userIdentifier)
    }
}
