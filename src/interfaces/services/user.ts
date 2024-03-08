import { DocStatus, DocumentType, OwnerType, PlatformType, UserDocumentSubtype, UserFeatures } from '@diia-inhouse/types'

export interface DocumentTypeOrder {
    documentTypeOrder: number
    documentIdentifiers?: {
        [key: string]: number
    }
}

export interface UserDocumentsOrderResponse {
    documentType: DocumentType
    documentIdentifiers?: string[]
}

export interface CheckedDocumentPoints {
    documentType: DocumentType
    documentIdentifier: string
}

export interface CheckDocumentsFeaturePointsResult {
    documents: CheckedDocumentPoints[]
}

export type EncryptedDataByDocumentType = Record<string, string[]>

export interface GetDataFromStorageParams {
    userIdentifier: string
    documentTypes?: DocumentType[]
    mobileUid?: string
}

export interface DocumentFilter {
    documentType: DocumentType
    ownerType?: OwnerType
    docId?: string
    docStatus?: DocStatus[]
}

export interface HasDocumentsResult {
    hasDocuments: boolean
    missingDocumnets: DocumentType[]
}

export interface UserDocument {
    documentType: DocumentType
    documentIdentifier: string
    ownerType: OwnerType
    docId?: string
    docStatus?: DocStatus
    registrationDate?: Date
    expirationDate?: Date
}

export interface GetUserDocumentsParams {
    userIdentifier: string
    documentType?: DocumentType
    mobileUid?: string
    activeOnly?: boolean
}

export interface GetUserDocumentsResult {
    documents: UserDocument[]
}

export interface HasStorageDocumentParams {
    userIdentifier: string
    mobileUid: string
    documentType: DocumentType
    id: string
}

export interface ProcessUserDocumentsParams {
    userIdentifier: string
    documentTypes: DocumentType[]
}

export interface UserDocumentsOrderParams {
    userIdentifier: string
    features?: UserFeatures
}

export interface UserProfileRemoveDocumentPhotoMessage {
    userIdentifier: string
    documentType: DocumentType
    documentIdentifier: string
}

export interface UserProfileAddDocumentPhotoMessage extends UserProfileRemoveDocumentPhotoMessage {
    photo: string
}

export interface UserProfileAddDocumentMessage extends UserProfileDocument {
    userIdentifier: string
    documentType: DocumentType
    headers: {
        mobileUid: string
        platformType: PlatformType
        platformVersion: string
        appVersion: string
    }
}

export interface UserProfileAddDocumentsMessage {
    userIdentifier: string
    documentType: DocumentType
    documents: UserProfileDocument[]
    headers: {
        mobileUid?: string
        platformType?: PlatformType
        platformVersion?: string
        appVersion?: string
    }
    removeMissingDocuments: boolean
}

export interface UserProfileDocument {
    documentSubType?: UserDocumentSubtype | string
    documentIdentifier: string
    normalizedDocumentIdentifier?: string
    ownerType: OwnerType
    docId: string
    docStatus: DocStatus
    registrationDate?: Date
    issueDate?: Date
    expirationDate?: Date
    fullNameHash?: string
    documentData?: Record<string, unknown>
    compoundDocument?: UserCompoundDocument
}

export interface UserCompoundDocument {
    documentType: DocumentType
    documentIdentifier: string
}
