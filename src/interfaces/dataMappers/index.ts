import { DocumentType, DocumentTypeCamelCase } from '@diia-inhouse/types'

import { CommonDocument } from '@interfaces/services/documents'
import { ManualDocumentListItemWithOrder } from '@interfaces/services/manualDocumentsList'
import { UserProfileDocument } from '@interfaces/services/user'

export interface DocumentDataMapper {
    documentTypes: DocumentType[]
    manualDocumentsList?: ManualDocumentListItemWithOrder[]
    enrichUserProfileDocument?(
        profileDocument: UserProfileDocument,
        document: CommonDocument,
        documentType?: DocumentType,
    ): UserProfileDocument
}

export interface DocumentDesignSystemDataMapper {
    documentTypeToComponentDocumentName?: Partial<Record<DocumentTypeCamelCase, string>>
}
