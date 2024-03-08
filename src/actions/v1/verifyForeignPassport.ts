import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, DocumentType, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentVerificationService from '@services/documentVerification'

import Utils from '@utils/index'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/verifyForeignPassport'

export default class VerifyForeignPassportAction implements AppAction {
    constructor(
        private readonly documentVerificationService: DocumentVerificationService,
        private readonly appUtils: Utils,
    ) {}

    readonly sessionType: SessionType = SessionType.User

    readonly name: string = 'verifyForeignPassport'

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly validationRules: ValidationSchema = {
        otp: { type: 'uuid' },
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            session: { user },
            params: { otp },
            headers: { token },
        } = args

        return await this.documentVerificationService.verifyDocument({
            otp,
            documentType: DocumentType.ForeignPassport,
            token,
            representative: this.appUtils.collectRepresentative(user),
        })
    }
}
