import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import { CustomActionArguments } from '@src/documents/taxpayerCard/interfaces/action/v1/shareTaxpayerCard'
import { DocumentType } from '@src/documents/taxpayerCard/interfaces/services'

import DocumentVerificationService from '@services/documentVerification'

import { ShareLinkResponse } from '@interfaces/services/documentVerification'

export default class ShareTaxpayerCardAction implements AppAction {
    constructor(private readonly documentVerificationService: DocumentVerificationService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'shareTaxpayerCard'

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
            documentType: DocumentType.TaxpayerCard,
            documentId,
            headers,
            user,
        })
    }
}
