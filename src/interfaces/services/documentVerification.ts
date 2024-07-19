import { ObjectId } from '@diia-inhouse/db'
import {
    ActHeaders,
    AppUserActionHeaders,
    DocStatus,
    DocumentCommon,
    DocumentMetaData,
    Localization,
    OwnerType,
    UserFeatures,
    UserTokenData,
} from '@diia-inhouse/types'

import { Representative } from '@interfaces/providers/eis'
import { DocumentInstance } from '@interfaces/services'

export interface ShareLinkParams {
    documentType: string
    documentId: string
    headers: AppUserActionHeaders
    user: UserTokenData
    features?: UserFeatures
    localization?: Localization
    serieNumber?: SerieNumberAssertParams
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

export interface DocumentAssertParams {
    user: UserTokenData
    features?: UserFeatures
    serieNumber?: SerieNumberAssertParams
}

export interface SerieNumberAssertParams {
    serie: string
    number: string
}

export interface AssertStrategyParams {
    documentId: string
    documentType: string
    ownerType: OwnerType
    documentAssertParams: DocumentAssertParams
}

export type AssertStrategy = (params: AssertStrategyParams) => Promise<void> | never

export type ShareSettingsStrategy = (documentType: string) => ShareSettings

export interface ShareSettings {
    generateBarcode: boolean
    checkExpirationDocumentType?: string
}

export interface DocumentVerifyParams {
    representative?: Representative
    designSystem?: boolean
    documentType?: string
}

export interface VerifyDocumentParams extends DocumentVerifyParams {
    otp: string
    documentType: string
    token: string
}

export type VerificationStrategy = (
    otp: VerifyOtpResponse,
    params?: DocumentVerifyParams,
) => Promise<DocumentCommon | DocumentInstance | DocumentMetaData>

export type VerificationByDataStrategy = <T>(qrCode: string, headers: ActHeaders, designSystem: boolean) => Promise<VerificationResponse<T>>

export type DocumentTypeDefinerByQrCodeStrategy = (qrCode: string) => string | undefined

export interface VerificationData {
    registryDocumentType: string
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
