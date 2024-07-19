import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentsService from '@services/documents'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/getSharingRenderDataByDocumentType'

export default class GetSharingRenderDataByDocumentTypeAction implements AppAction {
    constructor(private readonly documentsService: DocumentsService) {
        this.validationRules = {
            documentType: { type: 'string', enum: this.documentsService.documentTypes },
            data: { type: 'object' },
            requester: { type: 'string' },
            requestDateTime: { type: 'string' },
            requestIdentifier: { type: 'string' },
        }
    }

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'getSharingRenderDataByDocumentType'

    readonly validationRules: ValidationSchema<CustomActionArguments['params']>

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { documentType, data, requester, requestDateTime, requestIdentifier },
        } = args

        return this.documentsService.getSharingRenderDataByDocumentType(documentType, data, requester, requestDateTime, requestIdentifier)
    }
}
