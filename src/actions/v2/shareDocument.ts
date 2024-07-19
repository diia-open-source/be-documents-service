import { GrpcAppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, Localization, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentVerificationService from '@services/documentVerification'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v2/shareDocument'

export default class ShareDocumentAction implements GrpcAppAction {
    constructor(private readonly documentVerificationService: DocumentVerificationService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V2

    readonly name: string = 'shareDocument'

    readonly validationRules: ValidationSchema<CustomActionArguments['params']> = {
        documentId: { type: 'string' },
        documentType: { type: 'string' },
        localization: { type: 'string', enum: Object.values(Localization), optional: true },
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            session: { user, features },
            params: { documentType, documentId, localization },
            headers,
        } = args

        return await this.documentVerificationService.getOtpShareResponse({
            documentType,
            documentId,
            headers,
            user,
            features,
            localization: <Localization>localization,
        })
    }
}
