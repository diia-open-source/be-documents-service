import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, DocumentType, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentsService from '@services/documents'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/getDocumentsToProcessByItn'

export default class GetDocumentsToProcessByItnAction implements AppAction {
    constructor(private readonly documentsService: DocumentsService) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'getDocumentsToProcessByItn'

    readonly validationRules: ValidationSchema<CustomActionArguments['params']> = {
        itn: { type: 'string' },
        documentTypes: { type: 'array', unique: true, items: { type: 'string', enum: Object.values(DocumentType) } },
        ignoreCache: { type: 'boolean', optional: true },
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { itn, documentTypes, ignoreCache = false },
        } = args

        return await this.documentsService.getDocumentsToProcessByItn(itn, documentTypes, ignoreCache)
    }
}
