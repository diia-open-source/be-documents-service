/* eslint-disable @typescript-eslint/no-shadow */
import { DocumentDecryptedData } from '@diia-inhouse/crypto'
import {
    ActHeaders,
    AppUser,
    AppUserActionHeaders,
    DocStatus,
    DocumentCommon,
    DocumentInstance,
    DocumentMetaData,
    DocumentType,
    DocumentTypeCamelCase,
    HttpStatusCode,
    Localization,
    PlatformType,
    ProfileFeature,
    SessionType,
    TableBlockOrg,
    TickerAtm,
    UnavailableDocument,
    UserActionHeaders,
    UserFeatures,
    UserTokenData,
} from '@diia-inhouse/types'

import { RegistryPassportDTO } from '@interfaces/dto'
import { ExpirationType } from '@interfaces/models/documentSetting'
import {
    TaxpayerCard as EmbeddedTaxpayerCard,
    ForeignPassportInstance,
    InternalPassportInstance,
    Passport,
} from '@interfaces/providers/eis'
import { AnalyticsActionResult } from '@interfaces/services'
import { DocumentDecryptedDataByDocumentType } from '@interfaces/services/cryptData'
import { DocumentCover, DocumentTicker, DocumentTickerCode } from '@interfaces/services/documentAttributes'
import { DocumentsMetaData } from '@interfaces/services/documentsMetaData'
import {
    AssertStrategyParams,
    DocumentTypeDefinerByQrCodeStrategy,
    DocumentVerifyParams,
    VerificationResponse,
    VerifyOtpResponse,
} from '@interfaces/services/documentVerification'
import { UserDocumentsOrderResponse, UserProfileDocument } from '@interfaces/services/user'

export enum DocumentTypeResponse {
    IdCard = 'idCard',
    ForeignPassport = 'foreignPassport',
}

export type DocumentStatusCode<T = HttpStatusCode> = HttpStatusCode | T

export type Document = InternalPassportInstance | ForeignPassportInstance

export type DocumentWithPhoto = CommonDocument & { photo: string }

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

export interface UnavailableDocumentWithStatusCode extends UnavailableDocument {
    statusCode: HttpStatusCode
}

export interface DocumentResponse<T extends DocumentResponseVariation> extends DocumentsMetaData {
    status: DocumentStatusCode
    data: T[]
    unavailableData?: UnavailableDocument[]
}

export type Documents<T extends DocumentResponseVariation> = Partial<Record<DocumentTypeResponse, DocumentResponse<T>>>

export enum DefaultValue {
    NotProvided = 'Не вказано',
    NotProvidedEN = 'Not Provided',
}

export interface UserDocumentsOrderDTO extends UserDocumentsOrderResponse {
    documentFilter: DocumentTypeResponse
}

export type DocumentsTypeOrder = {
    documentsTypeOrder: string[]
}

export type DocumentsWithOrder<T extends DocumentResponseVariation> = Documents<T> & DocumentsTypeOrder

export type DocumentsFeaturePointsExistence = Partial<Record<DocumentType, Set<string>>>

export enum IdentityDocumentType {
    InternalPassport = DocumentType.InternalPassport,
    ForeignPassport = DocumentType.ForeignPassport,
}

export type IdentityDocument = { identityType: DocumentType } & (Passport | unknown)

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

export type GetDocumentToProcessOptions = Partial<Record<DocumentType, DocumentsToProcessOptions>>

export type CommonDocument = (DocumentMetaData | DocumentCommon) & { id: string; taxpayerCard?: EmbeddedTaxpayerCard }

export interface GetDocumentsParams {
    documentType: DocumentType
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
    documentType?: DocumentType,
) => UserProfileDocument

export interface GetDocumentParams {
    documentType: DocumentType
    documentId: string
    user: UserTokenData
    headers: UserActionHeaders
}

export interface AddDocumentParams {
    documentType: string
    userIdentifier: string
    mobileUid: string
    data: Record<string, Record<string, never>>
    documentTypes?: DocumentType[]
}

export interface DeleteDocumentParams {
    user: AppUser
    documentId: string
    force: boolean | undefined
}

export interface GetDocumentResponse extends Partial<Record<DocumentTypeCamelCase, DocumentResponse<DocumentInstance>>> {
    processCode: number
}

export type AddDocumentStrategyResponse = [number | undefined, undefined | number]

export type DeleteDocumentStrategyResponse = number | undefined

export type GetDocumentStrategy = (params: GetDocumentParams) => Promise<GetDocumentResponse>

export type GetIdentityDocumentStrategy = (user: AppUser) => Promise<IdentityDocument | undefined>

export type AddDocumentStrategy = (params: AddDocumentParams) => Promise<AddDocumentStrategyResponse>

export type DeleteDocumentStrategy = (params: DeleteDocumentParams) => Promise<DeleteDocumentStrategyResponse>

export type EnrichDocumentsStrategy = (documents: CommonDocument[], enrichParams: EnrichDocumentsStrategyParams) => Promise<void>

export type SyncDocumentDataStrategy = (
    userIdentifier: string,
    documentType: DocumentType,
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
    type: DocumentTypeCamelCase
    eTag?: string
}

export interface DocumentWithETagResponse {
    status: DocumentStatusCode
    data: DocumentInstance[]
    eTag: string
}

export type DocumentsResponse = Partial<Record<DocumentTypeCamelCase, DocumentWithETagResponse>>

export interface DocumentService {
    addDocument?(params: AddDocumentParams): Promise<AddDocumentStrategyResponse | undefined>
    addDocumentType?: string
    addDocumentTypeToDocumentTypes?: Record<string, DocumentType[]>
    assertDocumentIsValid?(params: AssertStrategyParams): Promise<void> | never
    deleteDocument?(props: DeleteDocumentParams): Promise<DeleteDocumentStrategyResponse>
    deleteDocumentProcessCodeByType?: Partial<Record<DocumentType, [number, number]>>
    documentTypes: DocumentType[]
    documentTypeToDocumentTypeResponse: Partial<Record<DocumentType, string>>
    documentTypeToIdentityDocumentTypeResponse?: Partial<Record<DocumentType, string>>
    documentTypeResponsesToEnrich?: string[]
    documentTypeResponseToDocumentType: Partial<Record<string, DocumentType>>
    documentFilters?: DocumentType[]
    documentFiltersBySessionType?: Partial<Record<SessionType, DocumentType[]>>
    documentFiltersBySessionTypeAndFeature?: Partial<Record<SessionType, Partial<Record<ProfileFeature, DocumentType[]>>>>
    documentsToGetFeaturePoints?: DocumentType[]
    enrichDocumentsStrategiesByDocumentTypeResponse?: Record<string, EnrichDocumentsStrategy>
    getDocument?(params: GetDocumentParams): Promise<GetDocumentResponse>
    getDocuments?(params: GetDocumentsParams): Promise<GetDocumentsResult>
    getDocumentsToProcess?(params: GetDocumentsParams): Promise<GetDocumentsResult>
    getDocumentType?: DocumentType
    getIdentityDocumentStrategyBySessionType?: Partial<Record<SessionType, GetIdentityDocumentStrategy>>
    getIdentityDocumentByDocumentType?: Partial<Record<DocumentType, GetIdentityDocumentStrategy>>
    identityDocumentTypes?: DocumentType[]
    manualDocumentNames?: string[]
    showInManualList?(userIdentifier: string, addBtnCode: string): Promise<boolean>
    syncDocumentDataStrategies?: Partial<Record<DocumentType, SyncDocumentDataStrategy>>
    validDocStatusesByDocumentType?: Partial<Record<DocumentType, DocStatus[]>>
    documentTypeDefinerByQrCodeStrategies?: DocumentTypeDefinerByQrCodeStrategy[]
    verifyDocument?(response: VerifyOtpResponse, params?: DocumentVerifyParams): Promise<CommonDocument>
    defineDocumentTypeByQrCode?(qrCode: string): DocumentType | undefined
    verifyDocumentByData?<T>(qrCode: string, headers: ActHeaders, designSystem: boolean): Promise<VerificationResponse<T>>
    downloadDocument?(data: DocumentDownloadParams, user?: UserTokenData): Promise<DocumentDownloadResponse>
}

export interface DocumentExpirationService {
    documentsWithoutExpirationPerUser?: DocumentType[]
}

export interface DocumentAnalyticsService {
    documentTypeToGenerateOtpAnalyticsAction?: Partial<Record<DocumentType, string>>
    documentTypeToGetDocumentAnalyticsAction?: Partial<Record<DocumentType, string>>
    actionResultByStatusCode?: Partial<Record<DocumentStatusCode, AnalyticsActionResult>>
}

export interface DocumentAttributesService {
    covers?: Partial<Record<DocumentType, Partial<Record<DocStatus, DocumentCover>>>>
    documentTypesForPrefixedTrident?: Partial<Record<PlatformType, DocumentType[]>>
    tickers?: Partial<Record<DocumentType, Partial<Record<DocumentTickerCode, Partial<Record<Localization, TickerAtm>>>>>>
    tickersV1?: Record<Localization, Partial<Record<DocumentType, Partial<Record<DocumentTickerCode, DocumentTicker>>>>>
}

export interface DocumentDownloadParams {
    documentId: string
    documentType: DocumentType
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

export type DownloadStrategy = (data: DocumentDownloadParams, user?: UserTokenData) => Promise<DocumentDownloadResponse>
