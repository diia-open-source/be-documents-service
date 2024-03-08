import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, DocumentType, Localization, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentVerificationService from '@services/documentVerification'

import { CustomActionArguments } from '@interfaces/actions/v1/shareForeignPassport'
import { PassportType } from '@interfaces/dto'
import { PassportAssertParams, ShareLinkResponse } from '@interfaces/services/documentVerification'

export default class ShareForeignPassportAction implements AppAction {
    constructor(private readonly documentVerificationService: DocumentVerificationService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'shareForeignPassport'

    readonly validationRules: ValidationSchema = {
        documentId: { type: 'string' },
        localization: { type: 'string', enum: Object.values(Localization), optional: true },
    }

    async handler(args: CustomActionArguments): Promise<ShareLinkResponse> {
        const {
            session: { user },
            params: { documentId, localization },
            headers,
        } = args

        const documentAssertParams: PassportAssertParams = { user, passportType: PassportType.P }

        return await this.documentVerificationService.generateOtpLink({
            documentType: DocumentType.ForeignPassport,
            documentId,
            headers,
            userIdentifier: user.identifier,
            documentAssertParams,
            generateBarcode: true,
            localization,
        })
    }
}
