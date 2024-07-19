import { Localization } from '@diia-inhouse/types'

import { DocumentInstance } from '@interfaces/services'
import { CommonDocument } from '@interfaces/services/documents'
import { ManualDocumentListItemWithOrder } from '@interfaces/services/manualDocumentsList'
import { UserProfileDocument } from '@interfaces/services/user'

export interface DocumentDataMapper<TDoc, TDocType> {
    documentTypes: TDocType[]
    manualDocumentsList?: ManualDocumentListItemWithOrder[]
    toDocumentInstance(document: TDoc, params?: object): DocumentInstance
    toVerifyDocumentInstance(document: TDoc, params?: object): DocumentInstance
    enrichUserProfileDocument?(profileDocument: UserProfileDocument, document: CommonDocument, documentType?: string): UserProfileDocument
}

/** @deprecated use DocumentDataMapper instead */
export interface DocumentDataMapperV1 {
    documentTypes: string[]
    manualDocumentsList?: ManualDocumentListItemWithOrder[]
    enrichUserProfileDocument?(profileDocument: UserProfileDocument, document: CommonDocument, documentType?: string): UserProfileDocument
}

export interface DesignSystemFrontCardParams {
    locale?: Localization
    withPhoto?: boolean
    withEllipseMenu?: boolean
    docNumberCopy?: boolean
}
