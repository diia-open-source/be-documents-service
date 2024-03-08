import { AppUserActionHeaders, DocumentType, PlatformType } from '@diia-inhouse/types'

import { CommonDocument, DocumentStatusCode } from '@interfaces/services/documents'

export enum AnalyticsCategory {
    VerificationDocuments = 'verificationDocuments',
}

export enum AnalyticsActionType {
    GetIdCard = 'getIdCard',
    GetForeignPassport = 'getForeignPassport',
    GetUId = 'getUId',
    GetDocument = 'getDocument',

    GenerateOtpIdCard = 'generateOtpIdCard',
    GenerateOtpForeignPassport = 'generateOtpForeignPassport',
}

export enum AnalyticsActionResult {
    Success = 'success',
    OldModel = 'oldModel',
    NeedVerification = 'needVerification',
    NoPhoto = 'noPhoto',
    Confirming = 'confirming',
    NotConfirmed = 'notConfirmed',
    Inactive = 'inactive',
    Error = 'error',
    NotFound = 'notFound',
}

export enum DocumentAnalyticsCategory {
    GetDocuments = 'getDocuments',
    AddDocuments = 'addDocuments',
}

export interface DocumentAnalyticsParams {
    documentType: DocumentType
    document?: CommonDocument
    userIdentifier: string
    headers: AppUserActionHeaders
    statusCode?: DocumentStatusCode
    category?: DocumentAnalyticsCategory
    documentId?: string
    data?: DocumentAnalytics['data']
}

export interface DocumentAnalytics {
    date: string
    category: DocumentAnalyticsCategory
    action: {
        type: AnalyticsActionType
        result: AnalyticsActionResult
    }
    identifier: string
    appVersion: string
    device: {
        identifier: string
        platform: {
            type: PlatformType
            version: string
        }
    }
    data?: {
        documentId: string
        subtype?: string
        expirationDate?: string
        vehicleLicenseId?: string
        [key: string]: unknown
    }
}

export type Writeable<T> = { -readonly [P in keyof T]: T[P] }

export enum AttentionMessageParameterType {
    Link = 'link',
    Phone = 'phone',
    Email = 'email',
}

export interface AttentionMessageParameter {
    type: AttentionMessageParameterType
    data: {
        name: string
        alt: string
        resource: string
    }
}

export interface AttentionMessage {
    icon: string
    title?: string
    text?: string
    parameters?: AttentionMessageParameter[]
}

export interface TextWithParameters {
    text: string
    parameters?: AttentionMessageParameter[]
}

export interface NameValue {
    name: string
    value: string
}
