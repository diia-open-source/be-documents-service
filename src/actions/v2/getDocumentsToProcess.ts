import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentsService from '@services/documents'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v2/getDocumentsToProcess'

export default class GetDocumentsToProcessAction implements AppAction {
    constructor(private readonly documentsService: DocumentsService) {
        this.validationRules = {
            documentTypes: { type: 'array', unique: true, items: { type: 'string', enum: this.documentsService.documentTypes } },
            ignoreCache: { type: 'boolean', optional: true },
            queries: {
                type: 'record',
                key: { type: 'enum', values: this.documentsService.documentTypes },
                value: {
                    type: 'object',
                    props: { id: { type: 'string' } },
                },
                optional: true,
            },
        }
    }

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V2

    readonly name: string = 'getDocumentsToProcess'

    readonly validationRules: ValidationSchema<CustomActionArguments['params']>

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { documentTypes, queries = {}, ignoreCache = false },
            session: { user },
            headers,
        } = args

        return await this.documentsService.getDocumentsToProcess(user, headers, documentTypes, queries, ignoreCache)
    }
}
