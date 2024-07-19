import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentVerificationService from '@services/documentVerification'

import { CustomActionArguments } from '@interfaces/actions/v1/shareInternalPassport'
import { ShareLinkResponse } from '@interfaces/services/documentVerification'
import { PassportDocumentType } from '@interfaces/services/passport'

export default class ShareInternalPassportAction implements AppAction {
    constructor(private readonly documentVerificationService: DocumentVerificationService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'shareInternalPassport'

    readonly validationRules: ValidationSchema = {
        documentId: { type: 'string' },
    }

    async handler(args: CustomActionArguments): Promise<ShareLinkResponse> {
        const {
            session: { user },
            params: { documentId },
            headers,
        } = args

        return await this.documentVerificationService.generateOtpLink({
            documentType: PassportDocumentType.InternalPassport,
            documentId,
            headers,
            user,
        })
    }
}
