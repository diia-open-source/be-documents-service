import { IdentifierService } from '@diia-inhouse/crypto'
import { DocStatus, OnRegistrationsFinished } from '@diia-inhouse/types'

import DocumentAttributesService from '@services/documentAttributes'

import Utils from '@utils/index'

import { DocumentDataMapper } from '@interfaces/dataMappers'
import { CommonDocument, DocumentWithCover, EnrichUserProfileDocumentStrategy } from '@interfaces/services/documents'
import { UserProfileDocument } from '@interfaces/services/user'

export default class DocumentsDataMapper implements OnRegistrationsFinished {
    private readonly enrichUserProfileDocumentByDocumentType: Record<string, EnrichUserProfileDocumentStrategy> = {}

    constructor(
        private readonly appUtils: Utils,
        private readonly identifier: IdentifierService,
        private readonly documentAttributesService: DocumentAttributesService,
        private readonly documentDataMappers: DocumentDataMapper<object, string>[],
    ) {}

    onRegistrationsFinished(): void {
        for (const instance of this.documentDataMappers) {
            const { documentTypes = [], enrichUserProfileDocument } = instance

            for (const documentType of documentTypes) {
                Object.assign(
                    this.enrichUserProfileDocumentByDocumentType,
                    enrichUserProfileDocument ? { [documentType]: enrichUserProfileDocument.bind(instance) } : {},
                )
            }
        }
    }

    toDocumentsWithCover(documents: CommonDocument[], documentType: string): DocumentWithCover[] {
        return documents.map(({ id, docStatus, ...rest }) => ({
            id,
            docStatus,
            ...(docStatus === DocStatus.NotFound
                ? {
                      cover: this.documentAttributesService.notFoundCover,
                  }
                : {
                      cover: this.documentAttributesService.getCover(documentType, docStatus),
                      document: { id, docStatus, ...rest },
                  }),
        }))
    }

    toUserProfileDocument(documentType: string, document: CommonDocument): UserProfileDocument {
        const { id, docStatus, docNumber, fullNameHash } = document

        const documentSubType = this.appUtils.getDocumentSubType(document)
        const ownerType = this.appUtils.getDocumentOwnerType(document)
        const expirationDate = this.appUtils.getDocumentExpirationDate(document)
        const issueDate = this.appUtils.getDocumentIssueDate(document)

        const profileDocument: UserProfileDocument = {
            documentSubType,
            documentIdentifier: this.identifier.createIdentifier(docNumber),
            ownerType,
            docId: id,
            docStatus,
            expirationDate,
            issueDate,
            fullNameHash,
        }

        const enrichStrategy = this.enrichUserProfileDocumentByDocumentType[documentType]

        if (enrichStrategy) {
            enrichStrategy(profileDocument, document, documentType)
        }

        return profileDocument
    }
}
