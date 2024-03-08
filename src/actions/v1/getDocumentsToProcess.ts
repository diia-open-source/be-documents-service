import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentsService from '@services/documents'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/getDocumentsToProcess'

export default class GetDocumentsToProcessAction implements AppAction {
    constructor(private readonly documentsService: DocumentsService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'getDocumentsToProcess'

    readonly validationRules: ValidationSchema<CustomActionArguments['params']> = {
        filter: {
            type: 'array',
            items: { type: 'string', enum: <string[]>(<unknown>this.documentsService.documentFilters) },
            optional: true,
        },
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { filter = [] },
            session: { user },
        } = args

        return await this.documentsService.getDocumentsToProcessV1(filter, user)
    }
}
