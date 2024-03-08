import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, DocumentTypeCamelCase, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentsService from '@services/documents'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/getDesignSystemDocumentsToProcess'

export default class GetDesignSystemDocumentsToProcess implements AppAction {
    constructor(private readonly documentsService: DocumentsService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'getDesignSystemDocumentsToProcess'

    readonly validationRules: ValidationSchema<CustomActionArguments['params']> = {
        documents: {
            type: 'array',
            items: {
                type: 'object',
                props: {
                    type: { type: 'string', enum: Object.values(DocumentTypeCamelCase) },
                    eTag: { type: 'string', optional: true },
                },
            },
        },
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { documents = [] },
            session: { user },
            headers,
        } = args

        return await this.documentsService.getDesignSystemDocumentsToProcess(user, headers, documents)
    }
}
