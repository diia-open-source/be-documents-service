/* eslint-disable unicorn/no-nested-ternary */
import { createHash } from 'node:crypto'

import { find, identity, merge, uniq } from 'lodash'
import { SetRequired } from 'type-fest'

import { DocumentDecryptedData, IdentifierService } from '@diia-inhouse/crypto'
import { UpdateQuery } from '@diia-inhouse/db'
import { Task } from '@diia-inhouse/diia-queue'
import { EnvService } from '@diia-inhouse/env'
import { AccessDeniedError, BadRequestError, InternalServerError } from '@diia-inhouse/errors'
import {
    ActHeaders,
    AppUser,
    AppUserActionHeaders,
    DocStatus,
    DurationMs,
    GenericObject,
    HttpStatusCode,
    Logger,
    OnRegistrationsFinished,
    OwnerType,
    ProfileFeature,
    SessionType,
    UserFeatures,
    UserSession,
    UserTokenData,
} from '@diia-inhouse/types'
import { UserServiceClient } from '@diia-inhouse/user-service-client'
import { utils } from '@diia-inhouse/utils'

import TaxpayerCardService from '@src/documents/taxpayerCard/services/document'

import AnalyticsService from '@services/analytics'
import DocumentSettingsService from '@services/documentSettings'
import DocumentsExpirationService from '@services/documentsExpiration'
import DocumentStorageService from '@services/documentStorage'
import PassportService from '@services/passport'
import UserService from '@services/user'
import UserDocumentSettingsService from '@services/userDocumentSettings'

import DocumentsDataMapper from '@dataMappers/documentsDataMapper'

import Utils from '@utils/index'

import { ExpirationType } from '@interfaces/models/documentSetting'
import { DocumentIdsExpiration, DocumentsExpirationModel } from '@interfaces/models/documentsExpiration'
import { DocumentInstance } from '@interfaces/services'
import { DocumentDecryptedDataByDocumentType } from '@interfaces/services/cryptData'
import {
    AddDocumentParams,
    AddDocumentStrategy,
    AnyDocumentService,
    CommonDocument,
    DeleteDocumentStrategy,
    DeleteDocumentStrategyResponse,
    Document,
    DocumentResponse,
    DocumentResponseVariation,
    DocumentStatusCode,
    DocumentWithCover,
    DocumentWithETagRequest,
    DocumentWithETagResponse,
    Documents,
    DocumentsDefaultOrder,
    DocumentsFeaturePointsExistence,
    DocumentsResponse,
    DocumentsWithOrder,
    EnrichDocumentsStrategy,
    GetDocumentParams,
    GetDocumentResponse,
    GetDocumentStrategy,
    GetDocumentToProcessOptions,
    GetDocumentsContext,
    GetDocumentsDataByTypeResult,
    GetDocumentsOutputParams,
    GetDocumentsParams,
    GetDocumentsResult,
    GetDocumentsStrategy,
    GetIdentityDocumentStrategy,
    GetSharingRenderDataByDocumentTypeStrategy,
    IdentityDocument,
    IsDocumentForceUpdate,
    IsDocumentForceUpdateParams,
    SkipSaveToUserProfileConditions,
    SyncDocumentDataStrategy,
    UnavailableDocument,
    UserDocumentsOrderDTO,
} from '@interfaces/services/documents'
import { DocumentIdStatus } from '@interfaces/services/documentsExpiration'
import { PassportDocumentType, PassportDocumentTypeCamelCase } from '@interfaces/services/passport'
import { ProcessUserDocumentsParams, UserDocumentsOrderResponse, UserProfileDocument } from '@interfaces/services/user'
import { ServiceTask } from '@interfaces/tasks'

export default class DocumentsService implements OnRegistrationsFinished {
    readonly documentTypeToDocumentTypeResponse: Record<string, string> = {
        [PassportDocumentType.InternalPassport]: PassportDocumentTypeCamelCase.IdCard,
        [PassportDocumentType.ForeignPassport]: PassportDocumentTypeCamelCase.ForeignPassport,
    }

    readonly documentTypeToIdentityDocumentTypeResponse: Record<string, string> = {
        ...this.documentTypeToDocumentTypeResponse,
    }

    readonly documentTypeResponseToDocumentType: Partial<Record<string, string>> = {
        [PassportDocumentTypeCamelCase.IdCard]: PassportDocumentType.InternalPassport,
        [PassportDocumentTypeCamelCase.ForeignPassport]: PassportDocumentType.ForeignPassport,
    }

    readonly documentTypes: string[] = [PassportDocumentType.InternalPassport, PassportDocumentType.ForeignPassport]

    readonly documentFilters: string[] = [PassportDocumentType.InternalPassport, PassportDocumentType.ForeignPassport]

    readonly documentFiltersBySessionType: Partial<Record<SessionType, string[]>> = {
        [SessionType.User]: this.documentFilters,
        [SessionType.CabinetUser]: this.documentFilters,
    }

    readonly allDocumentFilters: string[] = [...this.documentFilters]

    readonly documentFiltersBySessionTypeAndFeature: Partial<Record<SessionType, Partial<Record<ProfileFeature, string[]>>>> = {}

    private readonly documentsToGetFeaturePoints: string[] = [PassportDocumentType.InternalPassport, PassportDocumentType.ForeignPassport]

    private readonly getDocumentsStrategiesByDocumentType: Record<string, GetDocumentsStrategy | null>

    private readonly getDocumentsToProcessV1StrategiesByDocumentType: Record<string, GetDocumentsStrategy | null>

    readonly documentTypeToGrpcDocumentType: Record<string, string> = {
        [PassportDocumentType.InternalPassport]: 'internalPassport',
        [PassportDocumentType.ForeignPassport]: 'foreignPassport',
    }

    readonly getDocumentStrategies: Partial<Record<string, GetDocumentStrategy>> = {}

    private readonly syncDocumentDataStrategies: Record<string, SyncDocumentDataStrategy> = {}

    private readonly getIdentityDocumentStrategyBySessionType: Partial<Record<SessionType, GetIdentityDocumentStrategy>> = {}

    private readonly getIdentityDocumentByDocumentType: Record<string, GetIdentityDocumentStrategy>

    readonly identityDocumentTypes: string[] = [PassportDocumentType.InternalPassport, PassportDocumentType.ForeignPassport]

    readonly addDocumentStrategies: Record<string, AddDocumentStrategy> = {}

    readonly documentForceUpdateStrategies: Partial<Record<string, IsDocumentForceUpdate>> = {}

    readonly addDocumentToRelatedDocuments: Record<string, string[]> = {}

    readonly deleteDocumentStrategies: Record<string, DeleteDocumentStrategy> = {}

    readonly deleteDocumentProcessCodeByType: Record<string, [number, number]> = {}

    private readonly documentTypeResponsesToEnrich: string[] = [
        PassportDocumentTypeCamelCase.ForeignPassport,
        PassportDocumentTypeCamelCase.IdCard,
    ]

    private readonly enrichDocumentsStrategiesByDocumentTypeResponse: Record<string, EnrichDocumentsStrategy> = {}

    private readonly defaultSortOrder: Record<string, number> = {
        [PassportDocumentType.InternalPassport]: 100,
        [PassportDocumentType.ForeignPassport]: 110,
    }

    private documentsDefaultOrder: DocumentsDefaultOrder = {}

    private documentTypeToName: Record<string, string> = {
        [PassportDocumentType.InternalPassport]: 'Паспорт громадянина України',
        [PassportDocumentType.ForeignPassport]: 'Закордонний паспорт',
    }

    private readonly skipSaveToUserProfileConditionsByDocumentType: Record<string, SkipSaveToUserProfileConditions> = {}

    private readonly statusesToSaveDocumentData: DocumentStatusCode[] = [HttpStatusCode.OK, HttpStatusCode.NOT_FOUND]

    private readonly getSharingRenderDataByDocumentTypeStrategies: Record<string, GetSharingRenderDataByDocumentTypeStrategy>

    constructor(
        private readonly analyticsService: AnalyticsService,
        private readonly documentServices: Partial<AnyDocumentService>[],
        private readonly documentsExpirationService: DocumentsExpirationService,
        private readonly documentStorageService: DocumentStorageService,
        private readonly documentSettingsService: DocumentSettingsService,
        private readonly passportService: PassportService,
        private readonly taxpayerCardService: TaxpayerCardService,
        private readonly userService: UserService,
        private readonly userServiceClient: UserServiceClient,
        private readonly userDocumentSettingsService: UserDocumentSettingsService,

        private readonly documentsDataMapper: DocumentsDataMapper,

        private readonly appUtils: Utils,

        private readonly identifier: IdentifierService,
        private readonly envService: EnvService,
        private readonly logger: Logger,
        private readonly task: Task,
    ) {
        this.getDocumentsStrategiesByDocumentType = {
            [PassportDocumentType.ForeignPassport]: this.passportService.getForeignPassportDocuments.bind(this.passportService),
            [PassportDocumentType.InternalPassport]: this.passportService.getInternalPassportDocuments.bind(this.passportService),
        }
        this.getDocumentsToProcessV1StrategiesByDocumentType = {
            ...this.getDocumentsStrategiesByDocumentType,
        }
        this.getIdentityDocumentByDocumentType = {
            [PassportDocumentType.InternalPassport]: this.passportService.getIdentityDocument.bind(this.passportService),
            [PassportDocumentType.ForeignPassport]: this.passportService.getIdentityDocument.bind(this.passportService),
        }
        this.getSharingRenderDataByDocumentTypeStrategies = {
            [PassportDocumentType.ForeignPassport]: this.passportService.getForeignPassportSharingRenderData.bind(this.passportService),
            [PassportDocumentType.InternalPassport]: this.passportService.getInternalPassportSharingRenderData.bind(this.passportService),
        }
    }

    onRegistrationsFinished(): void {
        this.loadPluginDeps(this.documentServices)
        this.composeSortedByDefaultDocumentTypes(this.documentServices)
        this.composeDocumentTypeToName(this.documentServices)
    }

    getDocumentsFilterForSession(session: { sessionType: SessionType; features?: UserFeatures }): string[] {
        const { sessionType, features = {} } = session
        const filterBySessionType = this.documentFiltersBySessionType[sessionType]

        if (!filterBySessionType) {
            throw new BadRequestError('Unsupported session type')
        }

        const filter = [...filterBySessionType]

        for (const feature of Object.keys(features)) {
            const documentTypesByFeature = this.documentFiltersBySessionTypeAndFeature[sessionType] || {}
            const documentTypes = documentTypesByFeature[<ProfileFeature>feature] || []

            filter.push(...documentTypes)
        }

        return filter
    }

    async getDocuments<T extends DocumentResponseVariation>(
        session: UserSession,
        documentFilter: string[],
        headers: AppUserActionHeaders,
        outputParams: GetDocumentsOutputParams = {},
    ): Promise<DocumentsWithOrder<T>> {
        const { user, features = {} } = session
        const { withCover = false, designSystem = false } = outputParams
        const startTime = Date.now()
        const { mobileUid } = headers

        this.logger.info('Action getDocuments in', { mobileUid })
        this.validateUser(user)

        const { identifier: userIdentifier } = user

        const filteredDocTypes = documentFilter.map((docName) => this.documentTypeToDocumentTypeResponse[docName]).filter(Boolean)

        const documentTypes = uniq(filteredDocTypes)

        const [documentsExpiration, documentsSettings, userDocumentSettings, checkedPoints, storageDataByDocumentTypes] = await Promise.all(
            [
                this.documentsExpirationService.getDocumentsExpiration(mobileUid, userIdentifier),
                this.documentSettingsService.getDocumentsSettings(),
                this.userServiceClient.getUserDocumentSettings({
                    userIdentifier,
                    features: Object.keys(features),
                    documentsDefaultOrder: this.documentsDefaultOrder,
                }),
                this.checkDocumentsFeaturePoints(userIdentifier),
                this.userService.getDecryptedDataFromStorage({ userIdentifier, mobileUid }),
            ],
        )

        const { documentOrderSettings, documentVisibilitySettings } = userDocumentSettings
        const unavailableDocumentsByType = this.getUnavailableDocuments<T>(documentTypes, documentsExpiration)
        const result: Documents<T> = { ...unavailableDocumentsByType }
        const expirationsModifier: UpdateQuery<DocumentsExpirationModel> = {}
        const context: GetDocumentsContext = {}

        if (designSystem) {
            context.promisedTaxpayerCardTableOrg = this.taxpayerCardService.getTaxpayerCardTableOrg(user)
        }

        for (const documentType of this.documentTypes) {
            const isForceUpdateDocument = this.isDocumentForceUpdate({ documentType, documentsExpiration })
            if (isForceUpdateDocument) {
                documentTypes.push(<string>this.documentTypeToDocumentTypeResponse[documentType])
            }
        }

        const documentsToGetFromRegistry = documentTypes.filter((documentTypeResponse) => !unavailableDocumentsByType[documentTypeResponse])
        const tasks = documentsToGetFromRegistry.map(async (documentTypeResponse) => {
            const documentType = this.documentTypeResponseToDocumentType[documentTypeResponse]
            if (!documentType) {
                return
            }

            const documentVisibilitySetting = this.userDocumentSettingsService.findSettingsByType(documentVisibilitySettings, documentType)
            const isDocumentTypeHidden = await this.documentSettingsService.isDocumentTypeHidden(
                documentType,
                documentsSettings,
                documentVisibilitySetting,
            )

            if (isDocumentTypeHidden) {
                this.logger.info(`Hide document type by visibility settings: ${documentType}`)

                return
            }

            const getDocumentByTypeStartTime = Date.now()

            this.logger.info('Start call registry by document type', { documentType, startTime: getDocumentByTypeStartTime, mobileUid })

            const {
                customExpirationTime,
                expirationType,
                statusCode,
                unavailableDocuments,
                documents: documentsAll,
                documentsToProcess: documentsToProcessAll,
                designSystemDocuments: designSystemDocumentsAll,
            } = withCover
                ? await this.getDocumentsDataByTypeWithCovers(documentType, storageDataByDocumentTypes, context, session, headers)
                : await this.getDocumentsDataByType(documentType, storageDataByDocumentTypes, context, session, headers, designSystem)

            const documentsToProcess = this.userDocumentSettingsService.filterDocuments(documentVisibilitySetting, documentsToProcessAll)
            const visibleDocIds = new Set(documentsToProcess.map((el) => el.id))
            const documents = documentsAll.filter((doc) => visibleDocIds.has(doc.id))
            const designSystemDocuments = designSystemDocumentsAll.filter((doc) => visibleDocIds.has(doc.id))

            const getDocumentByTypeEndTime = Date.now()
            const documentStatuses = this.getDocumentStatuses(documentsToProcess, statusCode, documentType, userIdentifier, headers)
            const { expirationTime, modifier } = await this.documentsExpirationService.collectDocumentExpirationModifier(
                documentType,
                documentStatuses,
                expirationType,
                customExpirationTime,
            )

            const data = withCover
                ? this.documentsDataMapper.toDocumentsWithCover(documentsToProcess, documentType)
                : designSystem
                ? designSystemDocuments
                : documents

            Object.assign(expirationsModifier, modifier)
            result[documentTypeResponse] = {
                status: statusCode,
                data: <T[]>data,
                unavailableData: unavailableDocuments,
                ...this.documentsExpirationService.generateMetaData(expirationTime),
            }

            const decryptedDataFromStorage = this.appUtils.getStorageDataByDocumentTypes<DocumentDecryptedData>(
                documentType,
                storageDataByDocumentTypes,
            )

            await this.publishDocumentsEvents(
                userIdentifier,
                headers,
                documentType,
                documents,
                unavailableDocuments,
                decryptedDataFromStorage,
                statusCode,
                checkedPoints,
            )

            this.logger.info('End call registry by document type', {
                documentType,
                statusCode,
                mobileUid,
                duration: getDocumentByTypeEndTime - getDocumentByTypeStartTime,
                startTime: getDocumentByTypeStartTime,
                endTime: getDocumentByTypeEndTime,
                dataExists: data.length > 0,
                dataLength: data.length,
            })
        })

        await Promise.all(tasks)

        const documentGetter = withCover ? this.getDocumentFromDocumentWithCover : identity

        await Promise.all([
            this.documentsExpirationService.performDocumentsExpirationUpdate(mobileUid, userIdentifier, expirationsModifier),
            this.publishProcessDocumentsTask(userIdentifier, documentTypes),
        ])

        if (!designSystem) {
            await this.enrichDocuments(result, user, documentGetter)
        }

        const endTime = Date.now()

        this.logger.info('Action getDocuments out', { startTime, endTime, duration: endTime - startTime, mobileUid })

        return this.sortDocuments(result, documentOrderSettings, documentGetter)
    }

    async getDocumentsToProcess(
        user: UserTokenData,
        headers: AppUserActionHeaders,
        requestDocumentTypes: string[],
        options: GetDocumentToProcessOptions,
        ignoreCache: boolean,
    ): Promise<Documents<CommonDocument>> {
        const { itn } = user

        const result: Documents<CommonDocument> = {}
        const context: GetDocumentsParams['context'] = {}

        await Promise.all(
            requestDocumentTypes.map(async (documentType) => {
                const getDocumentOptions = options[documentType]
                const { id: selectedId } = getDocumentOptions || {}

                const { documents, unavailableDocuments, statusCode } = await this.getDocumentsByType({
                    documentType,
                    user,
                    itn,
                    headers,
                    context,
                    ignoreCache,
                    designSystem: false,
                })

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const data: any = documents.filter(({ id }) => (selectedId ? selectedId === id : true))

                result[documentType] = {
                    status: statusCode,
                    data,
                    unavailableData: unavailableDocuments,
                }
            }),
        )

        return result
    }

    async getDesignSystemDocumentsToProcess(
        user: UserTokenData,
        headers: AppUserActionHeaders,
        documentsWithETag: DocumentWithETagRequest[],
    ): Promise<DocumentsResponse> {
        const { itn, identifier: userIdentifier } = user
        const { mobileUid } = headers

        const documentsDataByType: Partial<Record<string, DocumentWithETagResponse>> = {}
        const expirationsModifier: UpdateQuery<DocumentsExpirationModel> = {}
        const context: GetDocumentsContext = {
            promisedTaxpayerCardTableOrg: this.taxpayerCardService.getTaxpayerCardTableOrg(user),
        }

        const documentsExpiration = await this.documentsExpirationService.getDocumentsExpiration(mobileUid, userIdentifier)

        const documentTypes = documentsWithETag.filter((docWithETag) => {
            const documentType = utils.camelCaseToDocumentType(docWithETag.type)
            const documentExpiration = <DocumentIdsExpiration | undefined>documentsExpiration?.[documentType]

            return this.documentsExpirationService.isDocumentExpired(documentExpiration, docWithETag.eTag)
        })

        this.logger.info(`Expired documents count: ${documentTypes.length}`, { documentsWithETag, documentTypes })

        await Promise.all(
            documentTypes.map(async ({ type: docTypeCamelCase }) => {
                const documentType = utils.camelCaseToDocumentType(docTypeCamelCase)

                const documentsData = await this.getDocumentsByType({
                    documentType,
                    user,
                    itn,
                    headers,
                    context,
                    designSystem: true,
                })

                const {
                    customExpirationTime,
                    expirationType,
                    statusCode,
                    documents: documentsToProcess,
                    designSystemDocuments: documents,
                } = documentsData

                const documentStatuses = this.getDocumentStatuses(documentsToProcess, statusCode, documentType, userIdentifier, headers)

                const eTag = createHash('md5').update(JSON.stringify(documents)).digest('base64')

                const { modifier } = await this.documentsExpirationService.collectDocumentExpirationModifier(
                    documentType,
                    documentStatuses,
                    expirationType,
                    customExpirationTime,
                    eTag,
                )

                Object.assign(expirationsModifier, modifier)

                documentsDataByType[docTypeCamelCase] = {
                    status: statusCode,
                    data: documents,
                    eTag,
                }

                if (this.statusesToSaveDocumentData.includes(statusCode)) {
                    await this.saveDocumentsInUserProfile(userIdentifier, documentType, documents, headers, false)
                }
            }),
        )

        await this.documentsExpirationService.performDocumentsExpirationUpdate(mobileUid, userIdentifier, expirationsModifier)

        return documentsDataByType
    }

    async getDocumentsToProcessByItn(itn: string, documentTypes: string[], ignoreCache: boolean): Promise<Documents<CommonDocument>> {
        const result: Documents<CommonDocument> = {}
        const context: GetDocumentsParams['context'] = {}

        await Promise.all(
            documentTypes.map(async (documentType) => {
                const { documents, unavailableDocuments, statusCode } = await this.getDocumentsByType({
                    documentType,
                    itn,
                    context,
                    ignoreCache,
                    designSystem: false,
                })

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                result[documentType] = { status: statusCode, data: <any>documents, unavailableData: unavailableDocuments }
            }),
        )

        return result
    }

    /** @deprecated */
    async getDocumentsToProcessV1(documentTypes: string[], user: UserTokenData): Promise<Documents<CommonDocument>> {
        const { itn } = user
        const result: Documents<CommonDocument> = {}
        const context: GetDocumentsParams['context'] = {}

        await Promise.all(
            documentTypes.map(async (documentType) => {
                const documentTypeResponse = this.documentTypeToDocumentTypeResponse[documentType]

                if (!documentTypeResponse) {
                    return
                }

                const { documents, statusCode } = await this.getDocumentsByType(
                    { documentType, user, itn, context, designSystem: false },
                    this.getDocumentsToProcessV1StrategiesByDocumentType,
                )

                result[documentTypeResponse] = { status: statusCode, data: documents }
            }),
        )
        await this.enrichDocuments(result, user)

        return result
    }

    async getFilteredDocumentsOrder(userIdentifier: string): Promise<string[]> {
        const { documentOrderSettings = [] } = await this.userServiceClient.getUserDocumentSettings({
            userIdentifier,
            features: [],
            documentsDefaultOrder: this.documentsDefaultOrder,
        })

        const documentsTypeOrder = documentOrderSettings
            .map((userDocumentOrder) => this.documentTypeToDocumentTypeResponse[userDocumentOrder.documentType])
            .filter(Boolean)

        return documentsTypeOrder
    }

    async getIdentityDocument(user: AppUser): Promise<IdentityDocument | undefined> {
        const { identifier: userIdentifier, sessionType } = user
        const getIdentityDocumentBySessionType = this.getIdentityDocumentStrategyBySessionType[sessionType]

        if (getIdentityDocumentBySessionType) {
            return await getIdentityDocumentBySessionType(user)
        }

        const filter = this.identityDocumentTypes.map((documentType) => [{ documentType }])
        const { missingDocumnets } = await this.userService.hasDocuments(userIdentifier, filter)
        const availableDocuments = this.identityDocumentTypes.filter((documentType) => !missingDocumnets.includes(documentType))

        const documentTypeWithAvailableStrategy = availableDocuments.find(
            (documentType) => this.getIdentityDocumentByDocumentType[documentType],
        )

        if (!documentTypeWithAvailableStrategy) {
            return
        }

        const getIdentityDocumentStrategy = this.getIdentityDocumentByDocumentType[documentTypeWithAvailableStrategy]!

        return await getIdentityDocumentStrategy(user)
    }

    async handlePhotoForDocumentToProcess(userIdentifier: string, documentType: string, document: CommonDocument): Promise<void> {
        const checkedPoints: DocumentsFeaturePointsExistence | undefined = await this.checkDocumentsFeaturePoints(userIdentifier)
        if (!checkedPoints) {
            throw new InternalServerError('Error occurred checking feature points')
        }

        await this.handleDocumentsPhoto(userIdentifier, documentType, [document], checkedPoints)
    }

    async getDocument(params: GetDocumentParams): Promise<GetDocumentResponse> {
        const { documentType: getDocumentType } = params

        const getDocumentStrategy = this.getDocumentStrategies[getDocumentType]
        if (!getDocumentStrategy) {
            throw new Error(`Unexpected getDocumentType: ${getDocumentType}`)
        }

        return await getDocumentStrategy(params)
    }

    async addDocument(params: AddDocumentParams): Promise<number | undefined> {
        const { userIdentifier, documentType: addDocumentType } = params

        const addDocumentStrategy = this.addDocumentStrategies[addDocumentType]
        if (!addDocumentStrategy) {
            throw new Error(`Unexpected addDocumentType: ${addDocumentType}`)
        }

        const relatedDocTypes = this.addDocumentToRelatedDocuments[addDocumentType]

        const [errorProcessCode, processCode] = await addDocumentStrategy({ ...params, documentTypes: relatedDocTypes })
        if (errorProcessCode) {
            return errorProcessCode
        }

        await Promise.all(relatedDocTypes.map((docType) => this.documentsExpirationService.expireDocumentByType(docType, userIdentifier)))

        return processCode
    }

    async deleteDocument(
        user: AppUser,
        documentType: string,
        documentId: string,
        mobileUid: string,
        force: boolean | undefined,
    ): Promise<DeleteDocumentStrategyResponse> {
        const deleteDocumentStrategy = this.deleteDocumentStrategies[documentType]
        if (deleteDocumentStrategy) {
            return await deleteDocumentStrategy({ user, documentId, force })
        }

        if (force === undefined || force) {
            await this.userService.removeUserDocumentById(user.identifier, documentType, documentId, mobileUid)
        }

        const [processCodeSuccessfullyRemovedOperation, processCodeConfirmDeletionOperation] =
            this.deleteDocumentProcessCodeByType[documentType] || []

        if (force) {
            return processCodeSuccessfullyRemovedOperation
        }

        return processCodeConfirmDeletionOperation
    }

    async saveDocumentsInUserProfile(
        userIdentifier: string,
        documentType: string,
        documents: CommonDocument[],
        headers: ActHeaders,
        removeMissingDocuments = true,
    ): Promise<void> {
        const userProfileDocuments = documents
            .map((document): UserProfileDocument | undefined => {
                const conditions = this.skipSaveToUserProfileConditionsByDocumentType[documentType]

                if (conditions && conditions.env === this.envService.getEnv() && conditions.docStatuses.includes(document.docStatus)) {
                    return
                }

                return this.documentsDataMapper.toUserProfileDocument(documentType, document)
            })
            // eslint-disable-next-line unicorn/prefer-native-coercion-functions
            .filter((item): item is UserProfileDocument => Boolean(item))

        await this.userService.saveDocumentsInUserProfile({
            userIdentifier,
            documentType,
            documents: userProfileDocuments,
            headers,
            removeMissingDocuments,
        })
    }

    async syncDocumentDataInStorage(
        userIdentifier: string,
        documentType: string,
        documents: CommonDocument[],
        decryptedDataFromStorage: DocumentDecryptedData[],
        unavailableDocuments?: UnavailableDocument[],
    ): Promise<void> {
        const strategy = this.syncDocumentDataStrategies[documentType]

        if (!strategy) {
            this.logger.log('No need to store data for this document type', { documentType })

            return
        }

        const tasks = strategy(userIdentifier, documentType, documents, decryptedDataFromStorage, unavailableDocuments)

        for (const dataToEncrypt of decryptedDataFromStorage) {
            if (!dataToEncrypt.isDeleted) {
                tasks.push(this.documentStorageService.removeFromStorage(userIdentifier, documentType, dataToEncrypt))
            }
        }

        await Promise.allSettled(tasks)
    }

    async handleDocumentsPhoto(
        userIdentifier: string,
        documentType: string,
        documents: CommonDocument[],
        checkedPoints: DocumentsFeaturePointsExistence | undefined,
    ): Promise<void> {
        try {
            if (!checkedPoints || !this.documentsToGetFeaturePoints.includes(documentType)) {
                return
            }

            const checkedDocumentIdentifiersSet = new Set<string>(checkedPoints[documentType])
            const sendPhotoTasks = documents.map(async (document) => {
                const photo = this.appUtils.getDocumentPhoto(document)
                if (!photo) {
                    return
                }

                const documentIdentifier = this.identifier.createIdentifier(document.docNumber)

                if (!checkedDocumentIdentifiersSet.has(documentIdentifier)) {
                    await this.userService.saveDocumentPhoto({
                        userIdentifier,
                        documentType,
                        documentIdentifier,
                        photo,
                    })
                }

                checkedDocumentIdentifiersSet.delete(documentIdentifier)
            })

            await Promise.all(sendPhotoTasks)

            const removePhotoTasks = [...checkedDocumentIdentifiersSet.values()].map(async (documentIdentifier: string) => {
                return await this.userService.removeDocumentPhoto({
                    userIdentifier,
                    documentType,
                    documentIdentifier,
                })
            })

            await Promise.all(removePhotoTasks)
        } catch (err) {
            this.logger.fatal('Failed to handle documents photos', { err })
        }
    }

    async checkDocumentsFeaturePoints(userIdentifier: string): Promise<DocumentsFeaturePointsExistence | undefined> {
        try {
            const result: DocumentsFeaturePointsExistence = {}
            const featurePointsResult = await this.userService.checkDocumentsFeaturePoints(userIdentifier)

            for (const { documentType, documentIdentifier } of featurePointsResult.documents) {
                if (!result[documentType]) {
                    result[documentType] = new Set<string>()
                }

                result?.[documentType]?.add(documentIdentifier)
            }

            return result
        } catch (err) {
            this.logger.fatal('Failed to check documents feature points', { err })
        }
    }

    validateUser(user: AppUser): void | never {
        const { itn, sessionType } = user
        if (sessionType !== SessionType.User) {
            return
        }

        if (!utils.isItnFormatValid(itn)) {
            this.logger.error(`User has invalid itn [${itn}] in token`)

            throw new AccessDeniedError('User has invalid data in token')
        }
    }

    async hasDocumentInRegistry(documentType: string, user: UserTokenData): Promise<boolean> {
        const documents = await this.getDocumentsToProcessV1([documentType], user)
        const docField = this.documentTypeToDocumentTypeResponse[documentType]

        if (!docField) {
            return false
        }

        const document = documents[docField]
        if (!document) {
            return false
        }

        const { data, status } = document
        if (status === HttpStatusCode.OK && data.length > 0) {
            return true
        }

        return false
    }

    getSortedByDefaultDocumentTypes(): DocumentsDefaultOrder {
        return this.documentsDefaultOrder
    }

    getDocumentNames(documentTypes: string[]): Record<string, string> {
        if (documentTypes.length === 0) {
            return this.documentTypeToName
        }

        return Object.fromEntries(Object.entries(this.documentTypeToName).filter(([documentType]) => documentTypes.includes(documentType)))
    }

    getSharingRenderDataByDocumentType(
        documentType: string,
        data: unknown,
        requester: string,
        requestDateTime: string,
        requestIdentifier: string,
    ): GenericObject {
        const getSharingRenderDataByDocumentTypeStrategy = this.getSharingRenderDataByDocumentTypeStrategies[documentType]
        if (!getSharingRenderDataByDocumentTypeStrategy) {
            throw new Error(`Unknown scope ${documentType}`)
        }

        return getSharingRenderDataByDocumentTypeStrategy(data, requester, requestDateTime, requestIdentifier, documentType)
    }

    private async enrichDocuments<T extends DocumentResponseVariation>(
        documents: Documents<T>,
        user: AppUser,
        documentGetter: (document: T) => CommonDocument | Document | DocumentInstance | undefined = identity,
    ): Promise<void> {
        const retrieveDocuments = (data: T[] | undefined): Document[] => {
            return data
                ? // eslint-disable-next-line unicorn/prefer-native-coercion-functions
                  data.map((document) => documentGetter(document)).filter((document): document is Document => Boolean(document))
                : []
        }

        let documentsToEnrich: CommonDocument[] = []
        for (const docTypeResponse of this.documentTypeResponsesToEnrich) {
            const docResponse = documents[docTypeResponse]
            const docs = retrieveDocuments(docResponse?.data)

            documentsToEnrich = [...documentsToEnrich, ...docs]
        }

        if (documentsToEnrich.length === 0) {
            return
        }

        await Promise.all(
            Object.entries(this.enrichDocumentsStrategiesByDocumentTypeResponse).map(async ([docTypeResponse, strategy]) => {
                const docResponse = documents[docTypeResponse]
                const documentsToEnrichWith = retrieveDocuments(docResponse?.data)

                await strategy(documentsToEnrich, { user, documentsToEnrichWith })
            }),
        )
    }

    private async getDocumentsByType(
        params: GetDocumentsParams,
        getDocumentsStrategiesByDocumentType = this.getDocumentsStrategiesByDocumentType,
    ): Promise<SetRequired<GetDocumentsResult<CommonDocument>, 'statusCode' | 'expirationType'>> {
        const { documentType } = params
        try {
            const getDocumentsStrategy = getDocumentsStrategiesByDocumentType[documentType]

            if (!getDocumentsStrategy) {
                throw new BadRequestError(`Unexpected documentType: ${documentType}`)
            }

            const {
                documents,
                designSystemDocuments,
                unavailableDocuments,
                statusCode = HttpStatusCode.OK,
                customExpirationTime,
            } = await getDocumentsStrategy(params)

            return {
                documents,
                designSystemDocuments,
                unavailableDocuments,
                statusCode,
                customExpirationTime,
                expirationType: unavailableDocuments?.length ? ExpirationType.PartialUnavailable : ExpirationType.Success,
            }
        } catch (err) {
            return utils.handleError(err, (apiError) => {
                this.logger.error(`Failed to get document by type ${documentType}`, { err })
                const statusCode = apiError.getCode() || HttpStatusCode.INTERNAL_SERVER_ERROR

                return {
                    documents: [],
                    designSystemDocuments: [],
                    statusCode,
                    expirationType:
                        statusCode >= HttpStatusCode.INTERNAL_SERVER_ERROR ? ExpirationType.RegistryError : ExpirationType.Success,
                }
            })
        }
    }

    private async getDocumentsDataByType(
        documentType: string,
        storageDataByDocumentTypes: DocumentDecryptedDataByDocumentType,
        context: GetDocumentsContext,
        session: UserSession,
        headers: AppUserActionHeaders,
        designSystem = false,
    ): Promise<GetDocumentsDataByTypeResult> {
        const { user, features } = session
        const { itn } = user
        const { documents, designSystemDocuments, unavailableDocuments, statusCode, expirationType, customExpirationTime } =
            await this.getDocumentsByType({
                documentType,
                user,
                itn,
                headers,
                features,
                storageDataByDocumentTypes,
                context,
                designSystem,
            })

        return {
            documents,
            documentsToProcess: documents,
            designSystemDocuments,
            unavailableDocuments,
            statusCode,
            expirationType,
            customExpirationTime,
        }
    }

    private async getDocumentsDataByTypeWithCovers(
        documentType: string,
        storageDataByDocumentTypes: DocumentDecryptedDataByDocumentType,
        context: GetDocumentsContext,
        session: UserSession,
        headers: AppUserActionHeaders,
    ): Promise<GetDocumentsDataByTypeResult> {
        const { user } = session
        const { identifier: userIdentifier } = user
        const { mobileUid } = headers
        const [
            { documents, designSystemDocuments, unavailableDocuments, statusCode, expirationType, customExpirationTime },
            { documents: userDocuments },
        ] = await Promise.all([
            this.getDocumentsDataByType(documentType, storageDataByDocumentTypes, context, session, headers),
            this.userService.getUserDocumentsV1({ userIdentifier, documentType, mobileUid, activeOnly: false }),
        ])
        const documentsToProcess: CommonDocument[] = [
            ...documents,
            ...userDocuments
                .filter((doc) => Boolean(doc.docId) && !find(documents, { id: doc.docId }))
                .map(({ docId, ownerType = OwnerType.owner }) => <Document>{ id: docId, ownerType, docStatus: DocStatus.NotFound }),
        ]

        return {
            documents,
            documentsToProcess,
            designSystemDocuments,
            unavailableDocuments,
            statusCode,
            expirationType,
            customExpirationTime,
        }
    }

    private async publishDocumentsEvents(
        userIdentifier: string,
        headers: ActHeaders,
        documentType: string,
        documents: CommonDocument[],
        unavailableDocuments: UnavailableDocument[] | undefined,
        decryptedDataFromStorage: DocumentDecryptedData[],
        statusCode: DocumentStatusCode,
        checkedPoints: DocumentsFeaturePointsExistence | undefined,
    ): Promise<void> {
        if (!this.statusesToSaveDocumentData.includes(statusCode)) {
            return
        }

        await Promise.all([
            this.saveDocumentsInUserProfile(userIdentifier, documentType, documents, headers, false),
            this.syncDocumentDataInStorage(userIdentifier, documentType, documents, decryptedDataFromStorage, unavailableDocuments),
            this.handleDocumentsPhoto(userIdentifier, documentType, documents, checkedPoints),
        ])
    }

    private async publishProcessDocumentsTask(userIdentifier: string, documentTypes: string[]): Promise<void> {
        const payload: ProcessUserDocumentsParams = {
            userIdentifier,
            documentTypes: documentTypes
                .map((item) => this.documentTypeResponseToDocumentType[item])
                // eslint-disable-next-line unicorn/prefer-native-coercion-functions
                .filter((type: string | undefined): type is string => Boolean(type)),
        }

        await this.task.publish(ServiceTask.ProcessUserDocuments, payload, DurationMs.Minute * 5)
    }

    private composeSortedByDefaultDocumentTypes(instances: Partial<AnyDocumentService>[]): void {
        const docTypeBySortOrder: Map<SessionType, Map<number, string>> = new Map()

        instances
            .map(({ defaultSortOrder, sessionType }) => ({ defaultSortOrder, sessionType }))
            .concat({ defaultSortOrder: this.defaultSortOrder, sessionType: undefined })
            // eslint-disable-next-line unicorn/no-array-for-each
            .forEach(({ defaultSortOrder = {}, sessionType = SessionType.User }) => {
                // eslint-disable-next-line unicorn/no-array-for-each
                Object.entries(defaultSortOrder).forEach(([documentType, order]) => {
                    if (order === undefined) {
                        return
                    }

                    const existedOrderedDocType = docTypeBySortOrder.get(sessionType)?.get(order)
                    if (existedOrderedDocType) {
                        throw new InternalServerError(
                            `Order number is not unique for ${documentType}. ${order} number already assigned to ${existedOrderedDocType}`,
                        )
                    }

                    if (!docTypeBySortOrder.has(sessionType)) {
                        docTypeBySortOrder.set(sessionType, new Map())
                    }

                    docTypeBySortOrder.get(sessionType)?.set(order, documentType)
                })
            })

        for (const [sessionType, defaultSortOrders] of docTypeBySortOrder) {
            this.documentsDefaultOrder[sessionType] = {
                items: [...defaultSortOrders.entries()].sort(([a], [b]) => a - b).map(([, documentType]) => documentType),
            }
        }
    }

    private composeDocumentTypeToName(instances: Partial<AnyDocumentService>[]): void {
        for (const { documentTypeToName } of instances) {
            Object.assign(this.documentTypeToName, documentTypeToName)
        }
    }

    private getUnavailableDocuments<T extends Document | DocumentInstance | DocumentWithCover>(
        documentTypes: string[],
        documentsExpiration: DocumentsExpirationModel | null,
    ): Documents<T> {
        let unavailableDocuments = {}
        for (const documentTypeResponse of documentTypes) {
            const documentType = this.documentTypeResponseToDocumentType[documentTypeResponse]

            if (!documentType) {
                continue
            }

            const documentExpiration = <DocumentIdsExpiration | undefined>documentsExpiration?.[documentType]
            const metadata = this.documentsExpirationService.checkDocumentExpiration(documentType, documentExpiration)

            unavailableDocuments = {
                ...unavailableDocuments,
                ...(metadata ? { [documentTypeResponse]: { status: HttpStatusCode.FORBIDDEN, data: [], ...metadata } } : {}),
            }
        }

        return unavailableDocuments
    }

    private getDocumentStatuses(
        documents: CommonDocument[],
        statusCode: DocumentStatusCode,
        documentType: string,
        userIdentifier: string,
        headers: AppUserActionHeaders,
    ): DocumentIdStatus[] {
        const statuses = documents.map((document) => {
            const { id, docStatus } = document
            const ownerType = this.appUtils.getDocumentOwnerType(document)

            this.analyticsService.logDocumentAnalytics({ document, documentType, headers, statusCode, userIdentifier })

            return { id, ownerType, status: docStatus }
        })

        if (statuses.length === 0) {
            this.analyticsService.logDocumentAnalytics({ statusCode, documentType, userIdentifier, headers })
        }

        return statuses
    }

    private sortDocuments<T extends DocumentResponseVariation>(
        documents: Documents<T>,
        userDocumentsOrder: UserDocumentsOrderResponse[],
        documentGetter: (document: T) => CommonDocument | Document | DocumentInstance | undefined = identity,
    ): DocumentsWithOrder<T> {
        const docsWithoutSortOrder: string[] = []

        const userDocumentsOrderWithTypeFilter = this.getUserDocumentsOrderWithTypeFilter(userDocumentsOrder)
        const sortedDocuments: Documents<T> = userDocumentsOrderWithTypeFilter
            .map(({ documentFilter, ...rest }) => ({ ...rest, documentFilter, documentByType: documents[documentFilter] }))
            .filter(({ documentByType, documentFilter }) => {
                if (!documentByType) {
                    docsWithoutSortOrder.push(documentFilter)

                    return false
                }

                return true
            })
            // eslint-disable-next-line unicorn/no-array-reduce
            .reduce((acc, { documentFilter, documentByType, documentIdentifiers }) => {
                const sortedDocumentByType = this.sortDocumentsByCustomOrder(documentByType, documentIdentifiers, documentGetter)

                return { ...acc, [documentFilter]: sortedDocumentByType }
            }, {})

        this.logger.info(`Sort documents`, { userDocumentsOrder, docsWithoutSortOrder })

        return {
            ...sortedDocuments,
            documentsTypeOrder: userDocumentsOrderWithTypeFilter.map(({ documentFilter }) => documentFilter),
        }
    }

    private getUserDocumentsOrderWithTypeFilter(userDocumentsOrder: UserDocumentsOrderResponse[]): UserDocumentsOrderDTO[] {
        return userDocumentsOrder
            .map(({ documentType, ...rest }) => {
                const documentFilter = this.documentTypeToDocumentTypeResponse[documentType]

                return { ...rest, documentType, documentFilter }
            })
            .filter((docOrder: Partial<UserDocumentsOrderDTO>): docOrder is UserDocumentsOrderDTO => {
                const { documentType, documentFilter } = docOrder

                if (!documentFilter) {
                    this.logger.warn("Haven't found documentTypeFilter by documentType in user's documents order", { documentType })

                    return false
                }

                return true
            })
    }

    private isDocumentForceUpdate(params: IsDocumentForceUpdateParams): boolean {
        const isForceUpdateStrategy = this.documentForceUpdateStrategies[params.documentType]

        return isForceUpdateStrategy ? isForceUpdateStrategy(params) : false
    }

    private sortDocumentsByCustomOrder<T extends DocumentResponseVariation>(
        documentByType: DocumentResponse<T> | undefined,
        documentIdentifiersCustomOrder: string[] | undefined,
        documentGetter: (document: T) => CommonDocument | Document | DocumentInstance | undefined = identity,
    ): DocumentResponse<T> | undefined {
        if (!documentIdentifiersCustomOrder?.length || !documentByType?.data.length) {
            return documentByType
        }

        const sortedData: T[] = []
        const unsortedData: T[] = []
        const documentIdentifiers: string[] = []

        for (const [indx, item] of documentByType.data.entries()) {
            const document = documentGetter(item)
            if (document) {
                documentIdentifiers[indx] = this.identifier.createIdentifier(document.docNumber)
            } else {
                unsortedData.push(item)
            }
        }

        const filteredDocumentIdentifiersCustomOrder = documentIdentifiersCustomOrder.filter(
            (item) => item && documentIdentifiers.includes(item),
        )

        for (const [indx, item] of documentByType.data.entries()) {
            const documentIdentifier = documentIdentifiers[indx]
            const documentOrderIndex = filteredDocumentIdentifiersCustomOrder.indexOf(documentIdentifier)

            if (documentOrderIndex === -1) {
                unsortedData.push(item)
                continue
            }

            sortedData[documentOrderIndex] = item
        }

        return { ...documentByType, data: sortedData.concat(unsortedData) }
    }

    private getDocumentFromDocumentWithCover(
        document: CommonDocument | Document | DocumentInstance | DocumentWithCover,
    ): CommonDocument | Document | DocumentInstance | undefined {
        return (<DocumentWithCover>document).document
    }

    private loadPluginDeps(instances: Partial<AnyDocumentService>[]): void {
        for (const service of instances) {
            const {
                addDocument,
                addDocumentType,
                addDocumentTypeToDocumentTypes = {},
                getDocument,
                getDocuments,
                getDocumentsToProcess,
                getDocumentType,
                getIdentityDocumentByDocumentType = {},
                getIdentityDocumentStrategyBySessionType = {},
                deleteDocument,
                deleteDocumentProcessCodeByType = {},
                documentFilters = [],
                documentFiltersBySessionType = {},
                documentFiltersBySessionTypeAndFeature = {},
                documentTypes = [],
                documentTypeToGrpcDocumentType = {},
                documentTypeResponsesToEnrich = [],
                documentTypeResponseToDocumentType,
                documentTypeToIdentityDocumentTypeResponse = {},
                documentTypeToDocumentTypeResponse,
                documentsToGetFeaturePoints = [],
                enrichDocumentsStrategiesByDocumentTypeResponse = {},
                identityDocumentTypes = [],
                syncDocumentDataStrategies = {},
                skipSaveToUserProfileConditionsByDocumentType = {},
                isDocumentForceUpdate,
                getSharingRenderData,
            } = service

            for (const documentType of documentTypes) {
                Object.assign(this.getDocumentsStrategiesByDocumentType, { [documentType]: getDocuments?.bind(service) })
                Object.assign(this.getDocumentsToProcessV1StrategiesByDocumentType, {
                    [documentType]: getDocumentsToProcess ? getDocumentsToProcess.bind(service) : getDocuments?.bind(service),
                })
                Object.assign(this.deleteDocumentStrategies, deleteDocument ? { [documentType]: deleteDocument.bind(service) } : {})
                Object.assign(
                    this.documentForceUpdateStrategies,
                    isDocumentForceUpdate ? { [documentType]: isDocumentForceUpdate.bind(service) } : {},
                )
                Object.assign(this.getSharingRenderDataByDocumentTypeStrategies, {
                    [documentType]: getSharingRenderData?.bind(service),
                })
            }

            Object.assign(this.documentTypeToDocumentTypeResponse, documentTypeToDocumentTypeResponse)
            Object.assign(
                this.documentTypeToIdentityDocumentTypeResponse,
                this.documentTypeToDocumentTypeResponse,
                documentTypeToIdentityDocumentTypeResponse,
            )
            Object.assign(this.documentTypeResponseToDocumentType, documentTypeResponseToDocumentType)
            Object.assign(
                this.getDocumentStrategies,
                getDocument && getDocumentType ? { [getDocumentType]: getDocument.bind(service) } : {},
            )
            Object.assign(
                this.addDocumentStrategies,
                addDocument && addDocumentType ? { [addDocumentType]: addDocument.bind(service) } : {},
            )
            Object.assign(this.addDocumentToRelatedDocuments, addDocumentTypeToDocumentTypes)
            Object.assign(this.deleteDocumentProcessCodeByType, deleteDocumentProcessCodeByType)
            Object.assign(this.getIdentityDocumentByDocumentType, getIdentityDocumentByDocumentType)
            Object.assign(this.getIdentityDocumentStrategyBySessionType, getIdentityDocumentStrategyBySessionType)
            Object.assign(this.syncDocumentDataStrategies, syncDocumentDataStrategies)
            Object.assign(this.enrichDocumentsStrategiesByDocumentTypeResponse, enrichDocumentsStrategiesByDocumentTypeResponse)
            Object.assign(this.documentTypeToGrpcDocumentType, documentTypeToGrpcDocumentType)
            Object.assign(this.skipSaveToUserProfileConditionsByDocumentType, skipSaveToUserProfileConditionsByDocumentType)
            this.documentTypes.push(...documentTypes)
            this.documentFilters.push(...documentFilters)
            this.documentsToGetFeaturePoints.push(...documentsToGetFeaturePoints)
            this.identityDocumentTypes.push(...identityDocumentTypes)
            this.documentTypeResponsesToEnrich.push(...documentTypeResponsesToEnrich)
            merge(this.documentFiltersBySessionType, documentFiltersBySessionType)
            merge(this.documentFiltersBySessionTypeAndFeature, documentFiltersBySessionTypeAndFeature)
            this.allDocumentFilters.push(
                ...documentFilters,
                ...Object.values(this.documentFiltersBySessionTypeAndFeature)
                    .flatMap((val) => Object.values(val))
                    .flat(),
            )
        }
    }
}
