import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, OnInit, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentDownloadService from '@services/documentDownload'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/downloadDocument'

export default class DownloadDocumentAction implements AppAction, OnInit {
    constructor(private readonly documentDownloadService: DocumentDownloadService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'downloadDocument'

    readonly downloadDocumentTypes: string[] = []

    readonly validationRules: ValidationSchema<CustomActionArguments['params']> = {
        documentId: { type: 'string' },
        documentType: { type: 'enum', values: this.downloadDocumentTypes },
    }

    onInit(): void {
        this.downloadDocumentTypes.push(...Object.keys(this.documentDownloadService.downloadStrategies))
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params,
            session: { user },
        } = args

        return await this.documentDownloadService.downloadDocument(params, user)
    }
}
