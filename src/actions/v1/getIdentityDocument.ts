import { AppAction } from '@diia-inhouse/diia-app'

import { NotFoundError } from '@diia-inhouse/errors'
import { ActionVersion, SessionType } from '@diia-inhouse/types'

import DocumentsService from '@services/documents'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/getIdentityDocument'

export default class GetIdentityDocumentAction implements AppAction {
    constructor(private readonly documentsService: DocumentsService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'getIdentityDocument'

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            session: { user },
        } = args

        const identityDocument = await this.documentsService.getIdentityDocument(user)
        if (!identityDocument) {
            throw new NotFoundError('Identity document not found')
        }

        return identityDocument
    }
}
