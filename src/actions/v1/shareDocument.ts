import { GrpcAppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, Localization, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentVerificationService from '@services/documentVerification'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/shareDocument'

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
            session: { user, features },
            params: { documentId, documentType, localization },
            headers,
        } = args

        const shareDocumentResult = await this.documentVerificationService.generateOtpLink({
            documentType,
            documentId,
            headers,
            user,
            features,
            localization: <Localization>localization,
        })

        return {
            ...shareDocumentResult,
            id: String(shareDocumentResult.id),
        }
    }
}
