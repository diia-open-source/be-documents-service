import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, DocumentType, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import { ActionResult, CustomActionArguments } from '@src/documents/driverLicense/interfaces/actions/v1/verifyDriverLicense'

import DocumentVerificationService from '@services/documentVerification'

export default class VerifyDriverLicenseAction implements AppAction {
    constructor(private readonly documentVerificationService: DocumentVerificationService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'verifyDriverLicense'

    readonly validationRules: ValidationSchema<CustomActionArguments['params']> = {
        otp: { type: 'uuid' },
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { otp },
            headers: { token },
        } = args

        return await this.documentVerificationService.verifyDocument({ otp, documentType: DocumentType.DriverLicense, token })
    }
}
