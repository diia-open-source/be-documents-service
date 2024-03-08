import { ObjectId } from 'bson'

import {
    ActHeaders,
    AppUserActionHeaders,
    DocStatus,
    DocumentCommon,
    DocumentInstance,
    DocumentMetaData,
    DocumentType,
    Localization,
    OwnerType,
    UserTokenData,
} from '@diia-inhouse/types'

import { PassportType } from '@interfaces/dto'
import { Representative } from '@interfaces/providers/eis'

export interface ShareLinkParams {
    documentType: DocumentType
    documentId: string
    headers: AppUserActionHeaders
    userIdentifier: string
    documentAssertParams: AssertParams
    generateBarcode?: boolean
    localization?: Localization
}

export interface ShareLinkResponse {
    id: ObjectId
    link: string
    barcode?: string
    timerText: string
    timerTime: number
}

export interface VerifyOtpResponse {
    requestor: UserTokenData
    docId: string
    ownerType: OwnerType
    docStatus: DocStatus
    localization?: Localization
}

export interface StillValidResult {
    isStillValid: boolean
    ownerType: OwnerType
    docStatus: DocStatus
}

export interface AssertParams {
    checkExpirationDocumentType?: DocumentType
}

export interface ShareDocumentAssertParams extends AssertParams {
    itn: string
}

export interface PassportAssertParams extends AssertParams {
    user: UserTokenData
    passportType: PassportType
}

export type DocumentAssertParams = PassportAssertParams

export interface AssertStrategyParams {
    documentId: string
    documentType: DocumentType
    ownerType: OwnerType
    documentAssertParams: AssertParams
}

export type AssertStrategy = (params: AssertStrategyParams) => Promise<void> | never

export interface DocumentVerifyParams {
    representative?: Representative
    designSystem?: boolean
    documentType?: DocumentType
}

export interface VerifyDocumentParams extends DocumentVerifyParams {
    otp: string
    documentType: DocumentType
    token: string
}

export type VerificationStrategy = (
    otp: VerifyOtpResponse,
    params?: DocumentVerifyParams,
) => Promise<DocumentCommon | DocumentInstance | DocumentMetaData>

export type VerificationByDataStrategy = <T>(qrCode: string, headers: ActHeaders, designSystem: boolean) => Promise<VerificationResponse<T>>

export type DocumentTypeDefinerByQrCodeStrategy = (qrCode: string) => DocumentType | undefined

export interface VerificationData {
    registryDocumentType: DocumentType
    expirationDate: Date
    usedDate?: Date
    barcode: string
    otp: string
    mobileUid: string
    requestorJWE: string
    birthDay: string
    firstName: string
    middleName: string
    lastName: string
    documentId: string
    userIdentifier: string
}

export interface GetValidatedVerificationRecordResult {
    isValid: boolean
    errorMessage?: string
    verification?: VerificationData
}

export interface VerificationErrorResponse {
    isVerify: boolean
    error: {
        code?: string
        title?: string
        text?: string
        littleTitle?: string
    }
}

export type VerificationResponse<T = DocumentInstance> = VerificationErrorResponse | T | DocumentInstance
