import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, DocumentType, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentDownloadService from '@services/documentDownload'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/downloadDocument'

export default class DownloadDocumentAction implements AppAction {
    constructor(private readonly documentDownloadService: DocumentDownloadService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'downloadDocument'

    readonly validationRules: ValidationSchema<CustomActionArguments['params']> = {
        documentId: { type: 'string' },
        documentType: { type: 'enum', values: Object.values(DocumentType) },
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params,
            session: { user },
        } = args

        return await this.documentDownloadService.downloadDocument(params, user)
    }
}
