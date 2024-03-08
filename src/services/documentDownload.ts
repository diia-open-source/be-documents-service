import { PluginDepsCollection } from '@diia-inhouse/diia-app'

import { BadRequestError } from '@diia-inhouse/errors'
import { DocumentType, UserTokenData } from '@diia-inhouse/types'

import { DocumentDownloadParams, DocumentDownloadResponse, DocumentService, DownloadStrategy } from '@interfaces/services/documents'

export default class DocumentDownloadService {
    private readonly downloadStrategies: Partial<Record<DocumentType, DownloadStrategy>> = {}

    constructor(private readonly documentServices: PluginDepsCollection<DocumentService>) {
        this.loadPluginDeps(this.documentServices.items)
        this.documentServices.on('newItems', (instances) => this.loadPluginDeps(instances))
    }

    async downloadDocument(data: DocumentDownloadParams, user?: UserTokenData): Promise<DocumentDownloadResponse> {
        const { documentType } = data

        const downloadDocument = this.downloadStrategies[documentType]

        if (!downloadDocument) {
            throw new BadRequestError(`DownloadStrategy for ${documentType} is not defined`)
        }

        return await downloadDocument(data, user)
    }

    private loadPluginDeps(instances: DocumentService[]): void {
        instances.forEach((service) => {
            const { downloadDocument, documentTypes } = service

            documentTypes.forEach((documentType) => {
                Object.assign(this.downloadStrategies, downloadDocument ? { [documentType]: downloadDocument.bind(service) } : {})
            })
        })
    }
}
