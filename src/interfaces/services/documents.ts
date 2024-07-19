/* eslint-disable @typescript-eslint/no-shadow */
import { DocumentDecryptedData } from '@diia-inhouse/crypto'
import { Env } from '@diia-inhouse/env'
import {
    ActHeaders,
    AppUser,
    AppUserActionHeaders,
    DocStatus,
    DocumentCommon,
    DocumentMetaData,
    GenericObject,
    HttpStatusCode,
    Localization,
    NameValue,
    PlatformType,
    ProfileFeature,
    SessionType,
    TableBlockOrg,
    TickerAtm,
    UserActionHeaders,
    UserFeatures,
    UserTokenData,
} from '@diia-inhouse/types'

import { RegistryPassportDTO } from '@interfaces/dto'
import { ExpirationType } from '@interfaces/models/documentSetting'
import { DocumentsExpirationModel } from '@interfaces/models/documentsExpiration'
import {
    TaxpayerCard as EmbeddedTaxpayerCard,
    ForeignPassportInstance,
    InternalPassportInstance,
    Passport,
} from '@interfaces/providers/eis'
import { AnalyticsActionResult, DocumentInstance } from '@interfaces/services'
import { DocumentDecryptedDataByDocumentType } from '@interfaces/services/cryptData'
import { DocumentCover, DocumentTicker, DocumentTickerCode } from '@interfaces/services/documentAttributes'
import { DocumentsMetaData } from '@interfaces/services/documentsMetaData'
import {
    AssertStrategyParams,
    DocumentVerifyParams,
    ShareSettings,
    VerificationResponse,
    VerifyOtpResponse,
} from '@interfaces/services/documentVerification'
import { UserDocumentsOrderResponse, UserProfileDocument } from '@interfaces/services/user'

export enum DefaultValue {
    NotProvided = 'Не вказано',
    NotProvidedEN = 'Not Provided',
}

export type DocumentStatusCode<T = HttpStatusCode> = HttpStatusCode | T

export type Document = InternalPassportInstance | ForeignPassportInstance

export type DocumentWithPhoto = CommonDocument & { photo?: string }

export enum ComponentIdFrontCard {
    BirthDate = 'birth_date',
    Heading = 'heading',
    DocName = 'doc_name',
    DocData = 'doc_data',
    FullName = 'full_name',
    Category = 'category',
    DocNumber = 'doc_number',
    Ticker = 'ticker',
    BottomHeading = 'bottom_heading',
    Icon = 'icon',
}

export enum ComponentIdFullInfo {
    BirthDate = 'birth_date_full',
    Heading = 'heading_full',
    DocName = 'doc_name_full',
    DocDataOwner = 'doc_data_owner_full',
    DocDataIssue = 'doc_data_issue_full',
    DocDataDetails = 'doc_data_details_full',
    DocNumberHeading = 'doc_number_heading_full',
    Ticker = 'ticker_full',
    Surname = 'surname_full',
    GivenNames = 'given_names_full',
    IssueDate = 'issue_date_full',
    ExpiryDate = 'expiry_date_full',
    Authority = 'authority_full',
    Unzr = 'unzr_full',
    DocNumber = 'doc_number_full',
    Category = 'category_full',
    CategoryIssueDate = 'category_issue_date_full',
}

export interface DocumentWithCover {
    id: string
    docStatus: DocStatus
    document?: CommonDocument
    cover?: DocumentCover
}

export type DocumentResponseVariation = Document | CommonDocument | DocumentInstance | DocumentWithCover

export interface GetDocumentsOutputParams {
    withCover?: boolean
    designSystem?: boolean
}

export interface UnavailableDocument {
    id: string
}

export interface UnavailableDocumentWithStatusCode extends UnavailableDocument {
    statusCode: HttpStatusCode
}

export interface UserDocumentsOrderDTO extends UserDocumentsOrderResponse {
    documentFilter: string
}

export interface NameValueWithCode extends NameValue {
    code?: string
}

export interface DocumentResponse<T extends DocumentResponseVariation> extends DocumentsMetaData {
    status: DocumentStatusCode
    data: T[]
    unavailableData?: UnavailableDocument[]
}

export type DocumentsTypeOrder = {
    documentsTypeOrder: string[]
}

export type Documents<T extends DocumentResponseVariation> = Record<string, DocumentResponse<T>>

export interface DocumentsWithOrder<T extends DocumentResponseVariation> extends DocumentsTypeOrder {
    [key: string]: DocumentResponse<T> | string[]
}

export type DocumentsFeaturePointsExistence = Partial<Record<string, Set<string>>>

export type IdentityDocument = { identityType: string } & (Passport | unknown)

export interface GetDocumentsContext {
    promisedPassports?: Promise<RegistryPassportDTO | undefined>
    promisedTaxpayerCardTableOrg?: Promise<TableBlockOrg>
}

export interface GetDocumentsDataByTypeResult {
    documents: CommonDocument[]
    documentsToProcess: CommonDocument[]
    designSystemDocuments: DocumentInstance[]
    unavailableDocuments: UnavailableDocument[] | undefined
    statusCode: DocumentStatusCode
    expirationType: ExpirationType
    customExpirationTime?: number
}

export interface DocumentsToProcessOptions {
    id: string // filter by id
}

export type GetDocumentToProcessOptions = Record<string, DocumentsToProcessOptions>

export type CommonDocument = (DocumentMetaData | DocumentCommon) & { id: string; taxpayerCard?: EmbeddedTaxpayerCard }

export interface GetDocumentsParams<T extends string = string> {
    documentType: T
    itn: string
    designSystem: boolean
    user?: AppUser
    headers?: AppUserActionHeaders
    features?: UserFeatures
    storageDataByDocumentTypes?: DocumentDecryptedDataByDocumentType
    context: GetDocumentsContext
    ignoreCache?: boolean
}

export interface GetDocumentsResult<T extends CommonDocument = CommonDocument> {
    documents: T[]
    designSystemDocuments: DocumentInstance[]
    unavailableDocuments?: UnavailableDocument[]
    statusCode?: DocumentStatusCode
    expirationType?: ExpirationType
    customExpirationTime?: number
}

export interface EnrichDocumentsStrategyParams {
    documentsToEnrichWith: CommonDocument[]
    user: AppUser
}

export type GetDocumentsStrategy<T extends CommonDocument = CommonDocument> = (params: GetDocumentsParams) => Promise<GetDocumentsResult<T>>

export type EnrichUserProfileDocumentStrategy = (
    profileDocument: UserProfileDocument,
    document: CommonDocument,
    documentType?: string,
) => UserProfileDocument

export interface GetDocumentParams {
    documentType: string
    documentId: string
    user: UserTokenData
    headers: UserActionHeaders
}

export interface AddDocumentParams {
    documentType: string
    userIdentifier: string
    mobileUid: string
    data: Record<string, Record<string, never>>
    documentTypes?: string[]
}

export interface IsDocumentForceUpdateParams {
    documentType: string
    documentsExpiration: DocumentsExpirationModel | null
}

export interface DeleteDocumentParams {
    user: AppUser
    documentId: string
    force: boolean | undefined
}

export interface GetDocumentResponse {
    processCode: number
    [key: string]: DocumentResponse<DocumentInstance> | number
}

export type AddDocumentStrategyResponse = [number | undefined, undefined | number]

export type DeleteDocumentStrategyResponse = number | undefined

export type GetDocumentStrategy = (params: GetDocumentParams) => Promise<GetDocumentResponse>

export type GetIdentityDocumentStrategy = (user: AppUser) => Promise<IdentityDocument | undefined>

export type IsDocumentForceUpdate = (params: IsDocumentForceUpdateParams) => boolean

export type AddDocumentStrategy = (params: AddDocumentParams) => Promise<AddDocumentStrategyResponse>

export type DeleteDocumentStrategy = (params: DeleteDocumentParams) => Promise<DeleteDocumentStrategyResponse>

export type EnrichDocumentsStrategy = (documents: CommonDocument[], enrichParams: EnrichDocumentsStrategyParams) => Promise<void>

export type GetSharingRenderDataByDocumentTypeStrategy = (
    data: unknown,
    requester: string,
    requestDateTime: string,
    requestIdentifier: string,
    documentType?: string,
) => GenericObject

export type SyncDocumentDataStrategy = (
    userIdentifier: string,
    documentType: string,
    documents: CommonDocument[],
    decryptedDataFromStorage: DocumentDecryptedData[],
    unavailableDocuments?: UnavailableDocument[],
) => Promise<void>[]

export interface ObtainedDocument {
    userIdentifier: string
    documentIdentifier: string
}

export enum DocumentMediaAlias {
    Photo = 'photo',
    Signature = 'signature',
}

export interface GetDocumentsRequest {
    documents?: DocumentWithETagRequest[]
}

export interface DocumentWithETagRequest {
    type: string
    eTag?: string
}

export interface DocumentWithETagResponse {
    status: DocumentStatusCode
    data: DocumentInstance[]
    eTag: string
}

export type DocumentsResponse = Partial<Record<string, DocumentWithETagResponse>>

export interface SkipSaveToUserProfileConditions {
    env: Env
    docStatuses: DocStatus[]
}

export interface AddDocumentFeature {
    addDocumentType: string
    addDocumentTypeToDocumentTypes?: Record<string, string[]>
    addDocument(params: AddDocumentParams): Promise<AddDocumentStrategyResponse | undefined>
}

export interface AddListDocumentFeature {
    manualDocumentNames: string[]
    showInManualList?(user: AppUser, addBtnCode: string): Promise<boolean>
}

export interface HideDocumentFeature {
    deleteDocumentProcessCodeByType?: Partial<Record<string, [number, number]>>
    deleteDocument?(props: DeleteDocumentParams): Promise<DeleteDocumentStrategyResponse>
}

export interface IdentityDocumentFeature {
    identityDocumentTypes: string[]
    getIdentityDocumentByDocumentType?: Partial<Record<string, GetIdentityDocumentStrategy>>
    documentTypeToIdentityDocumentTypeResponse?: Partial<Record<string, string>>
    getIdentityDocumentStrategyBySessionType?: Partial<Record<SessionType, GetIdentityDocumentStrategy>>
}

export interface EnrichDocumentFeature {
    documentTypeResponsesToEnrich?: string[]
    enrichDocumentsStrategiesByDocumentTypeResponse?: Record<string, EnrichDocumentsStrategy>
}

export interface SessionFilterDocumentFeature {
    sessionType?: SessionType
    documentFiltersBySessionType?: Partial<Record<SessionType, string[]>>
    documentFiltersBySessionTypeAndFeature?: Partial<Record<SessionType, Partial<Record<ProfileFeature, string[]>>>>
}

export interface FeaturePointsDocumentFeature {
    documentsToGetFeaturePoints: string[]
}

export interface SyncDataDocumentFeature {
    syncDocumentDataStrategies: Record<string, SyncDocumentDataStrategy>
}

export interface ForceUpdateDocumentFeature {
    isDocumentForceUpdate(params: IsDocumentForceUpdateParams): boolean
}

export interface BaseDocumentService<T extends string, TCamel extends string> {
    documentTypes: T[]
    documentTypeToName: Record<T, string>
    documentTypeToDocumentTypeResponse: Record<T, TCamel>
    documentTypeResponseToDocumentType: Record<TCamel, T>
    defaultSortOrder: Record<T, number>
    documentFilters?: T[]
    getDocuments(params: GetDocumentsParams<T>): Promise<GetDocumentsResult>
}

export interface DocumentService<T extends string, TCamel extends string> extends BaseDocumentService<T, TCamel> {
    validDocStatusesByDocumentType?: Partial<Record<T, DocStatus[]>>
    skipSaveToUserProfileConditionsByDocumentType?: Record<T, SkipSaveToUserProfileConditions>
    documentTypeToGrpcDocumentType?: Partial<Record<T, TCamel>>
    /** @deprecated use add document instead */
    getDocumentType?: string
    assertDocumentIsValid(params: AssertStrategyParams): Promise<void> | never
    verifyDocument(response: VerifyOtpResponse, params?: DocumentVerifyParams): Promise<CommonDocument>
    getDocumentsToProcess?(params: GetDocumentsParams<T>): Promise<GetDocumentsResult>
    verifyDocumentByData?<T>(qrCode: string, headers: ActHeaders, designSystem: boolean): Promise<VerificationResponse<T>>
    defineDocumentTypeByQrCode?(qrCode: string): string | undefined
    downloadDocument?(data: DocumentDownloadParams<T>, user?: UserTokenData): Promise<DocumentDownloadResponse>
    getShareSettings?(documentType: string): ShareSettings
    getSharingRenderData?(
        data: unknown,
        requester: string,
        requestDateTime: string,
        requestIdentifier: string,
        documentType?: T,
    ): GenericObject
    /** @deprecated use add document instead */
    getDocument?(params: GetDocumentParams): Promise<GetDocumentResponse>
}

export type AnyDocumentService<T extends string = string, TCamel extends string = string> = DocumentService<T, TCamel> &
    ForceUpdateDocumentFeature &
    SyncDataDocumentFeature &
    FeaturePointsDocumentFeature &
    SessionFilterDocumentFeature &
    EnrichDocumentFeature &
    IdentityDocumentFeature &
    HideDocumentFeature &
    AddListDocumentFeature &
    AddDocumentFeature

export interface DocumentExpirationService {
    documentsToSkipExpiration?: string[]
    documentsWithoutExpirationPerUser?: string[]
}

export interface DocumentAnalyticsService {
    documentTypeToGenerateOtpAnalyticsAction?: Partial<Record<string, string>>
    documentTypeToGetDocumentAnalyticsAction?: Partial<Record<string, string>>
    actionResultByStatusCode?: Partial<Record<DocumentStatusCode, AnalyticsActionResult>>
}

export interface DocumentAttributesService {
    covers?: Partial<Record<string, Partial<Record<DocStatus, DocumentCover>>>>
    documentTypesForPrefixedTrident?: Partial<Record<PlatformType, string[]>>
    tickers?: Partial<Record<string, Partial<Record<DocumentTickerCode, Partial<Record<Localization, TickerAtm>>>>>>
    tickersV1?: Record<Localization, Partial<Record<string, Partial<Record<DocumentTickerCode, DocumentTicker>>>>>
}

export interface DocumentDownloadParams<T> {
    documentId: string
    documentType: T
}

export type DocumentDownloadResponse =
    | {
          documentFile: {
              file: string
              name: string
              mimeType: string
          }
      }
    | GetDocumentResponse

export type DownloadStrategy<T> = (data: DocumentDownloadParams<T>, user?: UserTokenData) => Promise<DocumentDownloadResponse>

export type DocumentsDefaultOrder = Partial<Record<SessionType, { items: string[] }>>
