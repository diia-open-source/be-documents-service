import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, DocumentType, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentVerificationService from '@services/documentVerification'

import { CustomActionArguments } from '@interfaces/actions/v1/shareInternalPassport'
import { PassportType } from '@interfaces/dto'
import { PassportAssertParams, ShareLinkResponse } from '@interfaces/services/documentVerification'

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

        const documentAssertParams: PassportAssertParams = { user, passportType: PassportType.ID }

        return await this.documentVerificationService.generateOtpLink({
            documentType: DocumentType.InternalPassport,
            documentId,
            headers,
            userIdentifier: user.identifier,
            documentAssertParams,
            generateBarcode: true,
        })
    }
}
