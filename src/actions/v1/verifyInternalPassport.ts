import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentVerificationService from '@services/documentVerification'

import Utils from '@utils/index'

import { CustomActionArguments } from '@interfaces/actions/v1/verifyInternalPassport'
import { InternalPassportInstance } from '@interfaces/providers/eis'
import { PassportDocumentType } from '@interfaces/services/passport'

export default class VerifyInternalPassportAction implements AppAction {
    constructor(
        private readonly documentVerificationService: DocumentVerificationService,
        private readonly appUtils: Utils,
    ) {}

    readonly sessionType: SessionType = SessionType.User

    readonly name: string = 'verifyInternalPassport'

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly validationRules: ValidationSchema<CustomActionArguments['params']> = {
        otp: { type: 'uuid' },
    }

    async handler(args: CustomActionArguments): Promise<InternalPassportInstance> {
        const {
            session: { user },
            params: { otp },
            headers: { token },
        } = args

        return await this.documentVerificationService.verifyDocument({
            otp,
            documentType: PassportDocumentType.InternalPassport,
            token,
            representative: this.appUtils.collectRepresentative(user),
        })
    }
}
