import { DocStatus, OwnerType, PlatformType, UserFeatures } from '@diia-inhouse/types'

export interface DocumentTypeOrder {
    documentTypeOrder: number
    documentIdentifiers?: {
        [key: string]: number
    }
}

export interface UserDocumentsOrderResponse {
    documentType: string
    documentIdentifiers?: string[]
}

export interface CheckedDocumentPoints {
    documentType: string
    documentIdentifier: string
}

export interface CheckDocumentsFeaturePointsResult {
    documents: CheckedDocumentPoints[]
}

export type EncryptedDataByDocumentType = Record<string, string[]>

export interface GetDataFromStorageParams {
    userIdentifier: string
    documentTypes?: string[]
    mobileUid?: string
}

export interface DocumentFilter {
    documentType: string
    ownerType?: OwnerType
    docId?: string
    docStatus?: DocStatus[]
}

export interface HasDocumentsResult {
    hasDocuments: boolean
    missingDocumnets: string[]
}

export interface UserDocument {
    documentType: string
    documentIdentifier: string
    ownerType: OwnerType
    docId?: string
    docStatus?: DocStatus
    registrationDate?: Date
    expirationDate?: Date
}

export interface GetUserDocumentsParams {
    userIdentifier: string
    documentType?: string
    mobileUid?: string
    activeOnly?: boolean
}

export interface GetUserDocumentsResult {
    documents: UserDocument[]
}

export interface HasStorageDocumentParams {
    userIdentifier: string
    mobileUid: string
    documentType: string
    id: string
}

export interface ProcessUserDocumentsParams {
    userIdentifier: string
    documentTypes: string[]
}

export interface UserDocumentsOrderParams {
    userIdentifier: string
    features?: UserFeatures
}

export interface UserProfileRemoveDocumentPhotoMessage {
    userIdentifier: string
    documentType: string
    documentIdentifier: string
}

export interface UserProfileAddDocumentPhotoMessage extends UserProfileRemoveDocumentPhotoMessage {
    photo: string
}

export interface UserProfileAddDocumentMessage extends UserProfileDocument {
    userIdentifier: string
    documentType: string
    headers: {
        mobileUid: string
        platformType: PlatformType
        platformVersion: string
        appVersion: string
    }
}

export interface UserProfileAddDocumentsMessage {
    userIdentifier: string
    documentType: string
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
    documentSubType?: string
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
    documentType: string
    documentIdentifier: string
}
