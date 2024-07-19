import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentsService from '@services/documents'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/hasDocumentInRegistry'

export default class HasDocumentInRegistryAction implements AppAction {
    constructor(private readonly documentsService: DocumentsService) {
        this.validationRules = {
            documentType: { type: 'string', enum: this.documentsService.documentTypes },
        }
    }

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'hasDocumentInRegistry'

    readonly validationRules: ValidationSchema<CustomActionArguments['params']>

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { documentType },
            session: { user },
        } = args

        return await this.documentsService.hasDocumentInRegistry(documentType, user)
    }
}
