import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, OnInit, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentsService from '@services/documents'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v2/getDocument'

export default class GetDocumentAction implements AppAction, OnInit {
    constructor(private readonly documentsService: DocumentsService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V2

    readonly name: string = 'getDocument'

    readonly getDocumentTypes: string[] = []

    readonly validationRules: ValidationSchema<CustomActionArguments['params']> = {
        documentType: { type: 'string', enum: this.getDocumentTypes },
        documentId: { type: 'string' },
    }

    onInit(): void {
        this.getDocumentTypes.push(...Object.keys(this.documentsService.getDocumentStrategies))
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { documentType, documentId },
            session: { user },
            headers,
        } = args

        return await this.documentsService.getDocument({ user, headers, documentType, documentId })
    }
}
