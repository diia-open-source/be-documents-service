import { GrpcAppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, DocumentType, Localization, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentVerificationService from '@services/documentVerification'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/shareDocument'
import { ShareDocumentAssertParams } from '@interfaces/services/documentVerification'

export default class ShareDocumentAction implements GrpcAppAction {
    constructor(private readonly documentVerificationService: DocumentVerificationService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'shareDocument'

    readonly validationRules: ValidationSchema<CustomActionArguments['params']> = {
        documentId: { type: 'string' },
        documentType: { type: 'string' },
        localization: { type: 'string', enum: Object.values(Localization), optional: true },
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            session: {
                user: { itn, identifier: userIdentifier },
            },
            params: { documentId, documentType, localization },
            headers,
        } = args

        const documentAssertParams: ShareDocumentAssertParams = { itn }

        const shareDocumentResult = await this.documentVerificationService.generateOtpLink({
            documentType: <DocumentType>documentType,
            documentId,
            headers,
            userIdentifier,
            documentAssertParams,
            generateBarcode: true,
            localization: <Localization>localization,
        })

        return {
            ...shareDocumentResult,
            id: String(shareDocumentResult.id),
        }
    }
}
