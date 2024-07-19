import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentsService from '@services/documents'
import DocumentsExpirationService from '@services/documentsExpiration'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/expireDocument'

export default class ExpireDocumentAction implements AppAction {
    constructor(
        private readonly documentsExpirationService: DocumentsExpirationService,
        private readonly documentsService: DocumentsService,
    ) {
        this.validationRules = {
            documentType: { type: 'string', enum: this.documentsService.documentTypes },
        }
    }

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'expireDocument'

    readonly validationRules: ValidationSchema

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            session: {
                user: { identifier: userIdentifier },
            },
            params: { documentType },
        } = args

        await this.documentsExpirationService.expireDocumentByType(documentType, userIdentifier)
    }
}
