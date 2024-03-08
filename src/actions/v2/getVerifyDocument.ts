import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, DocumentType, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentVerificationService from '@services/documentVerification'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v2/getVerifyDocument'

export default class GetVerifyDocumentAction implements AppAction {
    constructor(private readonly documentVerificationService: DocumentVerificationService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V2

    readonly name: string = 'getVerifyDocument'

    readonly validationRules: ValidationSchema<CustomActionArguments['params']> = {
        otp: { type: 'uuid' },
        documentType: { type: 'string', enum: Object.values(DocumentType) },
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { otp, documentType },
            headers: { token },
        } = args

        return await this.documentVerificationService.verifyDocument({ otp, documentType, token, designSystem: true })
    }
}
