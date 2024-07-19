import { BadRequestError } from '@diia-inhouse/errors'
import { OnRegistrationsFinished, UserTokenData } from '@diia-inhouse/types'

import { AnyDocumentService, DocumentDownloadParams, DocumentDownloadResponse, DownloadStrategy } from '@interfaces/services/documents'

export default class DocumentDownloadService implements OnRegistrationsFinished {
    readonly downloadStrategies: Record<string, DownloadStrategy<string>> = {}

    constructor(private readonly documentServices: Partial<AnyDocumentService>[]) {}

    onRegistrationsFinished(): void {
        for (const service of this.documentServices) {
            const { downloadDocument, documentTypes = [] } = service

            for (const documentType of documentTypes) {
                Object.assign(this.downloadStrategies, downloadDocument ? { [documentType]: downloadDocument.bind(service) } : {})
            }
        }
    }

    async downloadDocument(data: DocumentDownloadParams<string>, user?: UserTokenData): Promise<DocumentDownloadResponse> {
        const { documentType } = data

        const downloadDocument = this.downloadStrategies[documentType]

        if (!downloadDocument) {
            throw new BadRequestError(`DownloadStrategy for ${documentType} is not defined`)
        }

        return await downloadDocument(data, user)
    }
}
