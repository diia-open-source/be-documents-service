import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentsService from '@services/documents'
import DocumentVerificationService from '@services/documentVerification'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v2/verifyServiceEntranceDocument'

export default class VerifyServiceEntranceDocumentAction implements AppAction {
    constructor(
        private readonly documentsService: DocumentsService,
        private readonly documentVerificationService: DocumentVerificationService,
    ) {
        this.validationRules = {
            documentType: { type: 'string', enum: this.documentsService.documentTypes },
            otp: { type: 'uuid' },
        }
    }

    readonly sessionType: SessionType = SessionType.ServiceEntrance

    readonly actionVersion: ActionVersion = ActionVersion.V2

    readonly name: string = 'verifyServiceEntranceDocument'

    readonly validationRules: ValidationSchema<CustomActionArguments['params']>

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { documentType, otp },
            headers: { token },
        } = args

        return await this.documentVerificationService.verifyDocument({
            otp,
            documentType,
            token,
            designSystem: true,
        })
    }
}
