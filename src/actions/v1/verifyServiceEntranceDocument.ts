import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, DocumentType, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentVerificationService from '@services/documentVerification'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/verifyServiceEntranceDocument'

export default class VerifyServiceEntranceDocumentAction implements AppAction {
    constructor(private readonly documentVerificationService: DocumentVerificationService) {}

    readonly sessionType: SessionType = SessionType.ServiceEntrance

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'verifyServiceEntranceDocument'

    readonly validationRules: ValidationSchema<CustomActionArguments['params']> = {
        documentType: { type: 'string', enum: Object.values(DocumentType) },
        otp: { type: 'uuid' },
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { documentType, otp },
            headers: { token },
        } = args

        return await this.documentVerificationService.verifyDocument({
            otp,
            documentType,
            token,
        })
    }
}
