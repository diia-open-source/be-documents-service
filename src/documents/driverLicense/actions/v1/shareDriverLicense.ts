import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, DocumentType, Localization, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import { CustomActionArguments } from '@src/documents/driverLicense/interfaces/actions/v1/shareDriverLicense'
import { DriverLicenseAssertParams } from '@src/documents/driverLicense/interfaces/services/documentVerification'

import DocumentVerificationService from '@services/documentVerification'

import { ShareLinkResponse } from '@interfaces/services/documentVerification'

export default class ShareDriverLicenseAction implements AppAction {
    constructor(private readonly documentVerificationService: DocumentVerificationService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'shareDriverLicense'

    readonly validationRules: ValidationSchema = {
        documentId: { type: 'string' },
        localization: { type: 'string', enum: Object.values(Localization), optional: true },
    }

    async handler(args: CustomActionArguments): Promise<ShareLinkResponse> {
        const {
            session: {
                user: { itn, identifier: userIdentifier },
            },
            params: { documentId, localization },
            headers,
        } = args

        const documentAssertParams: DriverLicenseAssertParams = { itn }

        return await this.documentVerificationService.generateOtpLink({
            documentType: DocumentType.DriverLicense,
            documentId,
            headers,
            userIdentifier,
            documentAssertParams,
            generateBarcode: true,
            localization,
        })
    }
}
