import { GrpcAppAction } from '@diia-inhouse/diia-app'

import { InternalServerError, NotFoundError } from '@diia-inhouse/errors'
import { ActionVersion, SessionType } from '@diia-inhouse/types'

import DocumentsService from '@services/documents'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v3/getIdentityDocument'

export default class GetIdentityDocumentAction implements GrpcAppAction {
    constructor(private readonly documentsService: DocumentsService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V3

    readonly name: string = 'getIdentityDocument'

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            session: { user },
        } = args

        const identityDocument = await this.documentsService.getIdentityDocument(user)

        if (!identityDocument) {
            throw new NotFoundError('Identity document not found')
        }

        const { identityType, ...documentData } = identityDocument
        const identityDocumentTypeResponse = this.documentsService.documentTypeToIdentityDocumentTypeResponse[identityType]

        if (!identityDocumentTypeResponse) {
            throw new InternalServerError(`Unrecognized identityType ${identityType}`)
        }

        return { identityType, [identityDocumentTypeResponse]: documentData }
    }
}
