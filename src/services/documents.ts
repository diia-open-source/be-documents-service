import { createHash } from 'crypto'

import { find, identity, merge, uniq } from 'lodash'
import { UpdateQuery } from 'mongoose'
import { SetRequired } from 'type-fest'

import { PluginDepsCollection } from '@diia-inhouse/diia-app'

import { DocumentDecryptedData, IdentifierService } from '@diia-inhouse/crypto'
import { Task } from '@diia-inhouse/diia-queue'
import { EnvService } from '@diia-inhouse/env'
import { AccessDeniedError, BadRequestError, InternalServerError } from '@diia-inhouse/errors'
import {
    ActHeaders,
    AppUser,
    AppUserActionHeaders,
    DocStatus,
    DocumentInstance,
    DocumentType,
    DocumentTypeCamelCase,
    DurationMs,
    HttpStatusCode,
    Logger,
    OwnerType,
    ProfileFeature,
    SessionType,
    Documents as TypedDocuments,
    UnavailableDocument,
    UserFeatures,
    UserSession,
    UserTokenData,
} from '@diia-inhouse/types'
import { utils } from '@diia-inhouse/utils'

import TaxpayerCardService from '@src/documents/taxpayerCard/services/document'

import AnalyticsService from '@services/analytics'
import DocumentsExpirationService from '@services/documentsExpiration'
import DocumentStorageService from '@services/documentStorage'
import PassportService from '@services/passport'
import UserService from '@services/user'

import DocumentsDataMapper from '@dataMappers/documentsDataMapper'

import Utils from '@utils/index'

import { ExpirationType } from '@interfaces/models/documentSetting'
import { DocumentsExpirationModel } from '@interfaces/models/documentsExpiration'
import { DocumentDecryptedDataByDocumentType } from '@interfaces/services/cryptData'
import {
    AddDocumentParams,
    AddDocumentStrategy,
    CommonDocument,
    DeleteDocumentStrategy,
    DeleteDocumentStrategyResponse,
    Document,
    DocumentResponse,
    DocumentResponseVariation,
    DocumentService,
    DocumentStatusCode,
    DocumentTypeResponse,
    DocumentWithCover,
    DocumentWithETagRequest,
    DocumentWithETagResponse,
    Documents,
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
    IdentityDocument,
    SyncDocumentDataStrategy,
    UserDocumentsOrderDTO,
} from '@interfaces/services/documents'
import { DocumentIdStatus } from '@interfaces/services/documentsExpiration'
import { ProcessUserDocumentsParams, UserDocumentsOrderResponse, UserProfileDocument } from '@interfaces/services/user'
import { ServiceTask } from '@interfaces/tasks'

export default class DocumentsService {
    readonly documentTypeToDocumentTypeResponse: Partial<Record<DocumentType, DocumentTypeResponse>> = {
        [DocumentType.InternalPassport]: DocumentTypeResponse.IdCard,
        [DocumentType.ForeignPassport]: DocumentTypeResponse.ForeignPassport,
    }

    readonly documentTypeToIdentityDocumentTypeResponse: Partial<Record<DocumentType, string>> = {
        ...this.documentTypeToDocumentTypeResponse,
    }

    readonly documentTypeResponseToDocumentType: Partial<Record<DocumentTypeResponse, DocumentType>> = {
        [DocumentTypeResponse.IdCard]: DocumentType.InternalPassport,
        [DocumentTypeResponse.ForeignPassport]: DocumentType.ForeignPassport,
    }

    readonly documentFilters: DocumentType[] = [DocumentType.InternalPassport, DocumentType.ForeignPassport]

    readonly documentFiltersBySessionType: Partial<Record<SessionType, DocumentType[]>> = {
        [SessionType.User]: this.documentFilters,
        [SessionType.CabinetUser]: this.documentFilters,
    }

    readonly documentFiltersBySessionTypeAndFeature: Partial<Record<SessionType, Partial<Record<ProfileFeature, DocumentType[]>>>> = {}

    private readonly documentsToGetFeaturePoints: DocumentType[] = [DocumentType.InternalPassport, DocumentType.ForeignPassport]

    private readonly getDocumentsStrategiesByDocumentType: Partial<Record<DocumentType, GetDocumentsStrategy | null>> = {
        [DocumentType.ForeignPassport]: this.passportService.getForeignPassportDocuments.bind(this.passportService),
        [DocumentType.InternalPassport]: this.passportService.getInternalPassportDocuments.bind(this.passportService),
    }

    private readonly getDocumentsToProcessV1StrategiesByDocumentType: Partial<Record<DocumentType, GetDocumentsStrategy | null>> = {
        ...this.getDocumentsStrategiesByDocumentType,
    }

    readonly getDocumentStrategies: Partial<Record<string, GetDocumentStrategy>> = {}

    private readonly syncDocumentDataStrategies: Partial<Record<DocumentType, SyncDocumentDataStrategy>> = {
        [DocumentType.InternationalVaccinationCertificate]: () => [],
        [DocumentType.ChildLocalVaccinationCertificate]: () => [],
        [DocumentType.LocalVaccinationCertificate]: () => [],
    }

    private readonly getIdentityDocumentStrategyBySessionType: Partial<Record<SessionType, GetIdentityDocumentStrategy>> = {}

    private readonly getIdentityDocumentByDocumentType: Partial<Record<DocumentType, GetIdentityDocumentStrategy>> = {
        [DocumentType.InternalPassport]: this.passportService.getIdentityDocument.bind(this.passportService),
        [DocumentType.ForeignPassport]: this.passportService.getIdentityDocument.bind(this.passportService),
    }

    readonly identityDocumentTypes: DocumentType[] = [DocumentType.InternalPassport, DocumentType.ForeignPassport]

    readonly addDocumentStrategies: Record<string, AddDocumentStrategy> = {}

    readonly addDocumentToRelatedDocuments: Record<string, DocumentType[]> = {}

    readonly deleteDocumentStrategies: Partial<Record<DocumentType, DeleteDocumentStrategy>> = {}

    readonly deleteDocumentProcessCodeByType: Partial<Record<DocumentType, [number, number]>> = {}

    private readonly documentTypeResponsesToEnrich: string[] = [DocumentTypeResponse.ForeignPassport, DocumentTypeResponse.IdCard]

    private readonly enrichDocumentsStrategiesByDocumentTypeResponse: Record<string, EnrichDocumentsStrategy> = {}

    constructor(
        private readonly analyticsService: AnalyticsService,
        private readonly documentServices: PluginDepsCollection<DocumentService>,
        private readonly documentsExpirationService: DocumentsExpirationService,
        private readonly documentStorageService: DocumentStorageService,
        private readonly passportService: PassportService,
        private readonly taxpayerCardService: TaxpayerCardService,
        private readonly userService: UserService,

        private readonly documentsDataMapper: DocumentsDataMapper,

        private readonly appUtils: Utils,

        private readonly identifier: IdentifierService,
        private readonly envService: EnvService,
        private readonly logger: Logger,
        private readonly task: Task,
    ) {
        this.loadPluginDeps(this.documentServices.items)
        this.documentServices.on('newItems', (instances) => this.loadPluginDeps(instances))
    }

    getDocumentsFilterForSession(session: { sessionType: SessionType; features?: UserFeatures }): DocumentType[] {
        const { sessionType, features = {} } = session
        const filterBySessionType = this.documentFiltersBySessionType[sessionType]

        if (!filterBySessionType) {
            throw new BadRequestError('Unsupported session type')
        }

        const filter = [...filterBySessionType]

        Object.keys(features).forEach((feature) => {
            const documentTypesByFeature = this.documentFiltersBySessionTypeAndFeature[sessionType] || {}
            const documentTypes = documentTypesByFeature[<ProfileFeature>feature] || []

            filter.push(...documentTypes)
        })

        return filter
    }

    async getDocuments<T extends DocumentResponseVariation>(
        session: UserSession,
        documentFilter: DocumentType[],
        headers: AppUserActionHeaders,
        outputParams: GetDocumentsOutputParams = {},
    ): Promise<DocumentsWithOrder<T>> {
        const { user, features } = session
        const { withCover = false, designSystem = false } = outputParams
        const startTime: number = Date.now()
        const { mobileUid } = headers

        this.logger.info('Action getDocuments in', { startTime, mobileUid })
        this.validateUser(user)

        const { identifier: userIdentifier } = user

        const filteredDocTypes = documentFilter
            .map((docName) => this.documentTypeToDocumentTypeResponse[docName])
            .filter((type: DocumentTypeResponse | undefined): type is DocumentTypeResponse => !!type)
        const documentTypes = uniq(filteredDocTypes)

        const [documentsExpiration, checkedPoints, storageDataByDocumentTypes] = await Promise.all([
            this.documentsExpirationService.getDocumentsExpiration(mobileUid, userIdentifier),
            this.checkDocumentsFeaturePoints(userIdentifier),
            this.userService.getDecryptedDataFromStorage({ userIdentifier, mobileUid }),
        ])

        const unavailableDocumentsByType = this.getUnavailableDocuments<T>(documentTypes, documentsExpiration)
        const result: Documents<T> = { ...unavailableDocumentsByType }
        const expirationsModifier: UpdateQuery<DocumentsExpirationModel> = {}
        const context: GetDocumentsContext = {}

        // TODO(BACK-2386): add filter by docs that require verify block
        if (designSystem) {
            context.promisedTaxpayerCardTableOrg = this.taxpayerCardService.getTaxpayerCardTableOrg(user)
        }

        const tasks: Promise<void>[] = documentTypes
            .filter((documentTypeResponse) => !unavailableDocumentsByType[documentTypeResponse])
            .map(async (documentTypeResponse) => {
                const documentType = this.documentTypeResponseToDocumentType[documentTypeResponse]

                if (!documentType) {
                    return
                }

                const getDocumentByTypeStartTime = Date.now()

                this.logger.info('Start call registry by document type', { documentType, startTime: getDocumentByTypeStartTime, mobileUid })

                const {
                    customExpirationTime,
                    expirationType,
                    statusCode,
                    unavailableDocuments,
                    documents,
                    documentsToProcess,
                    designSystemDocuments,
                } = withCover
                    ? await this.getDocumentsDataByTypeWithCovers(documentType, storageDataByDocumentTypes, context, session, headers)
                    : await this.getDocumentsDataByType(documentType, storageDataByDocumentTypes, context, session, headers, designSystem)

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
                    dataExists: !!data.length,
                    dataLength: data.length,
                })
            })

        await Promise.all(tasks)

        const documentGetter = withCover ? this.getDocumentFromDocumentWithCover : identity
        const [userDocumentsOrder] = await Promise.all([
            this.userService.getDocumentsOrder({ userIdentifier, features }),
            this.documentsExpirationService.performDocumentsExpirationUpdate(mobileUid, userIdentifier, expirationsModifier),
            this.publishProcessDocumentsTask(userIdentifier, documentTypes),
        ])

        if (!designSystem) {
            await this.enrichDocuments(result, user, documentGetter)
        }

        const endTime = Date.now()

        this.logger.info('Action getDocuments out', { startTime, endTime, duration: endTime - startTime, mobileUid })

        return this.sortDocuments(result, userDocumentsOrder, documentGetter)
    }

    async getDocumentsToProcess<T extends DocumentType>(
        user: UserTokenData,
        headers: AppUserActionHeaders,
        requestDocumentTypes: T[],
        options: GetDocumentToProcessOptions,
        ignoreCache: boolean,
    ): Promise<TypedDocuments<T>> {
        const { itn } = user

        const result: TypedDocuments<T> = <TypedDocuments<T>>{}
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

        const documentsDataByType: Partial<Record<DocumentTypeCamelCase, DocumentWithETagResponse>> = {}
        const expirationsModifier: UpdateQuery<DocumentsExpirationModel> = {}
        const context: GetDocumentsContext = {
            promisedTaxpayerCardTableOrg: this.taxpayerCardService.getTaxpayerCardTableOrg(user),
        }

        const documentsExpiration = await this.documentsExpirationService.getDocumentsExpiration(mobileUid, userIdentifier)

        const documentTypes = documentsWithETag.filter((docWithETag) => {
            const documentType = utils.camelCaseToDocumentType[docWithETag.type]
            const documentExpiration = documentsExpiration?.[documentType]

            return this.documentsExpirationService.isDocumentExpired(documentExpiration, docWithETag.eTag)
        })

        this.logger.info(`Expired documents count: ${documentTypes.length}`, { documentsWithETag, documentTypes })

        await Promise.all(
            documentTypes.map(async ({ type: docTypeCamelCase }) => {
                const documentType = utils.camelCaseToDocumentType[docTypeCamelCase]

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
            }),
        )

        await this.documentsExpirationService.performDocumentsExpirationUpdate(mobileUid, userIdentifier, expirationsModifier)

        return documentsDataByType
    }

    async getDocumentsToProcessByItn<T extends DocumentType>(
        itn: string,
        documentTypes: T[],
        ignoreCache: boolean,
    ): Promise<TypedDocuments<T>> {
        const result: TypedDocuments<T> = <TypedDocuments<T>>{}
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
    async getDocumentsToProcessV1(documentTypes: DocumentType[], user: UserTokenData): Promise<Documents<CommonDocument>> {
        const { itn } = user
        const result: Documents<CommonDocument> = {}
        const context: GetDocumentsParams['context'] = {}

        await Promise.all(
            documentTypes.map(async (documentType: DocumentType) => {
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

    async getFilteredDocumentsOrder(userIdentifier: string): Promise<DocumentTypeResponse[]> {
        const userDocumentsOrder = await this.userService.getDocumentsOrder({ userIdentifier })

        const documentsTypeOrder = userDocumentsOrder
            .map((userDocumentOrder) => this.documentTypeToDocumentTypeResponse[userDocumentOrder.documentType])
            .filter((type: DocumentTypeResponse | undefined): type is DocumentTypeResponse => !!type)

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

    async handlePhotoForDocumentToProcess(userIdentifier: string, documentType: DocumentType, document: CommonDocument): Promise<void> {
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
        documentType: DocumentType,
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
        documentType: DocumentType,
        documents: CommonDocument[],
        headers: ActHeaders,
        removeMissingDocuments = true,
    ): Promise<void> {
        const userProfileDocuments = documents
            .map((document): UserProfileDocument | undefined => {
                if (documentType === DocumentType.TaxpayerCard && this.envService.isProd() && document.docStatus !== DocStatus.Ok) {
                    return
                }

                return this.documentsDataMapper.toUserProfileDocument(documentType, document)
            })
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
        documentType: DocumentType,
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

        decryptedDataFromStorage.forEach((dataToEncrypt: DocumentDecryptedData) => {
            if (!dataToEncrypt.isDeleted) {
                tasks.push(this.documentStorageService.removeFromStorage(userIdentifier, documentType, dataToEncrypt))
            }
        })

        await Promise.allSettled(tasks)
    }

    async handleDocumentsPhoto(
        userIdentifier: string,
        documentType: DocumentType,
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

            featurePointsResult.documents.forEach(({ documentType, documentIdentifier }) => {
                if (!result[documentType]) {
                    result[documentType] = new Set<string>()
                }

                result?.[documentType]?.add(documentIdentifier)
            })

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

    async hasDocumentInRegistry(documentType: DocumentType, user: UserTokenData): Promise<boolean> {
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
        if (status === HttpStatusCode.OK && data.length) {
            return true
        }

        return false
    }

    private async enrichDocuments<T extends DocumentResponseVariation>(
        documents: Documents<T>,
        user: AppUser,
        documentGetter: (document: T) => CommonDocument | Document | DocumentInstance | undefined = identity,
    ): Promise<void> {
        const retrieveDocuments = (data: T[] | undefined): Document[] => {
            return data
                ? data.map((document) => documentGetter(document)).filter((document): document is Document => Boolean(document))
                : []
        }

        const documentsToEnrich = this.documentTypeResponsesToEnrich.reduce(
            (acc, docTypeResponse) => {
                const docResponse = documents[<DocumentTypeResponse>docTypeResponse]
                const docs = retrieveDocuments(docResponse?.data)

                return [...acc, ...docs]
            },
            <CommonDocument[]>[],
        )

        if (!documentsToEnrich.length) {
            return
        }

        await Promise.all(
            Object.entries(this.enrichDocumentsStrategiesByDocumentTypeResponse).map(async ([docTypeResponse, strategy]) => {
                const docResponse = documents[<DocumentTypeResponse>docTypeResponse]
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
        documentType: DocumentType,
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
        documentType: DocumentType,
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
                .filter((doc) => !!doc.docId && !find(documents, { id: doc.docId }))
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
        documentType: DocumentType,
        documents: CommonDocument[],
        unavailableDocuments: UnavailableDocument[] | undefined,
        decryptedDataFromStorage: DocumentDecryptedData[],
        statusCode: DocumentStatusCode,
        checkedPoints: DocumentsFeaturePointsExistence | undefined,
    ): Promise<void> {
        const successCodes: DocumentStatusCode[] = [HttpStatusCode.OK, HttpStatusCode.NOT_FOUND]
        if (successCodes.includes(statusCode)) {
            await Promise.all([
                this.saveDocumentsInUserProfile(userIdentifier, documentType, documents, headers, false),
                this.syncDocumentDataInStorage(userIdentifier, documentType, documents, decryptedDataFromStorage, unavailableDocuments),
                this.handleDocumentsPhoto(userIdentifier, documentType, documents, checkedPoints),
            ])
        }
    }

    private async publishProcessDocumentsTask(userIdentifier: string, documentTypes: DocumentTypeResponse[]): Promise<void> {
        const payload: ProcessUserDocumentsParams = {
            userIdentifier,
            documentTypes: documentTypes
                .map((item) => this.documentTypeResponseToDocumentType[item])
                .filter((type: DocumentType | undefined): type is DocumentType => !!type),
        }

        await this.task.publish(ServiceTask.ProcessUserDocuments, payload, DurationMs.Minute * 5)
    }

    private getUnavailableDocuments<T extends Document | DocumentInstance | DocumentWithCover>(
        documentTypes: DocumentTypeResponse[],
        documentsExpiration: DocumentsExpirationModel | null,
    ): Documents<T> {
        return documentTypes.reduce((acc, documentTypeResponse) => {
            const documentType = this.documentTypeResponseToDocumentType[documentTypeResponse]

            if (!documentType) {
                return acc
            }

            const metadata = this.documentsExpirationService.checkDocumentExpiration(documentType, documentsExpiration?.[documentType])

            return { ...acc, ...(metadata ? { [documentTypeResponse]: { status: HttpStatusCode.FORBIDDEN, data: [], ...metadata } } : {}) }
        }, {})
    }

    private getDocumentStatuses(
        documents: CommonDocument[],
        statusCode: DocumentStatusCode,
        documentType: DocumentType,
        userIdentifier: string,
        headers: AppUserActionHeaders,
    ): DocumentIdStatus[] {
        const statuses = documents.map((document) => {
            const { id, docStatus } = document
            const ownerType = this.appUtils.getDocumentOwnerType(document)

            this.analyticsService.logDocumentAnalytics({ document, documentType, headers, statusCode, userIdentifier })

            return { id, ownerType, status: docStatus }
        })

        if (!statuses.length) {
            this.analyticsService.logDocumentAnalytics({ statusCode, documentType, userIdentifier, headers })
        }

        return statuses
    }

    private sortDocuments<T extends DocumentResponseVariation>(
        documents: Documents<T>,
        userDocumentsOrder: UserDocumentsOrderResponse[],
        documentGetter: (document: T) => CommonDocument | Document | DocumentInstance | undefined = identity,
    ): DocumentsWithOrder<T> {
        const userDocumentsOrderWithTypeFilter = this.getUserDocumentsOrderWithTypeFilter(userDocumentsOrder)
        const sortedDocuments: Documents<T> = userDocumentsOrderWithTypeFilter
            .map(({ documentFilter, ...rest }) => ({ ...rest, documentFilter, documentByType: documents[documentFilter] }))
            .filter(({ documentByType, documentFilter }) => {
                if (!documentByType) {
                    this.logger.info(`Documents not found by documentTypeFilter on sorting: ${documentFilter}`)

                    return false
                }

                return true
            })
            .reduce((acc, { documentFilter, documentByType, documentIdentifiers }) => {
                const sortedDocumentByType = this.sortDocumentsByCustomOrder(
                    documentByType,
                    documentIdentifiers,
                    documentFilter,
                    documentGetter,
                )

                this.logger.info(`Setting sorted documents for type: ${documentFilter}`, sortedDocumentByType)

                return { ...acc, [documentFilter]: sortedDocumentByType }
            }, {})

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

                this.logger.info(`Start sorting documents for ${documentType}`, { documentFilter })
                if (!documentFilter) {
                    this.logger.warn("Haven't found documentTypeFilter by documentType in user's documents order", { documentType })

                    return false
                }

                return true
            })
    }

    private sortDocumentsByCustomOrder<T extends DocumentResponseVariation>(
        documentByType: DocumentResponse<T> | undefined,
        documentIdentifiersCustomOrder: string[] | undefined,
        documentFilter: DocumentTypeResponse,
        documentGetter: (document: T) => CommonDocument | Document | DocumentInstance | undefined = identity,
    ): DocumentResponse<T> | undefined {
        if (!documentIdentifiersCustomOrder?.length || !documentByType?.data.length) {
            return documentByType
        }

        const sortedData: T[] = []
        const unsortedData: T[] = []
        const documentIdentifiers: string[] = []

        documentByType.data.forEach((item, indx: number) => {
            const document = documentGetter(item)
            if (document) {
                documentIdentifiers[indx] = this.identifier.createIdentifier(document.docNumber)
            } else {
                unsortedData.push(item)
            }
        })

        const filteredDocumentIdentifiersCustomOrder = documentIdentifiersCustomOrder.filter(
            (item) => item && documentIdentifiers.includes(item),
        )

        documentByType.data.forEach((item: T, indx: number) => {
            const documentIdentifier = documentIdentifiers[indx]
            const documentOrderIndex = filteredDocumentIdentifiersCustomOrder.indexOf(documentIdentifier)

            this.logger.info(`Setting document to sortedData: ${documentFilter}`, {
                documentIdentifier,
                documentOrderIndex,
            })
            if (documentOrderIndex === -1) {
                return unsortedData.push(item)
            }

            sortedData[documentOrderIndex] = item
        })

        return { ...documentByType, data: sortedData.concat(unsortedData) }
    }

    private getDocumentFromDocumentWithCover(
        document: CommonDocument | Document | DocumentInstance | DocumentWithCover,
    ): CommonDocument | Document | DocumentInstance | undefined {
        return (<DocumentWithCover>document).document
    }

    private loadPluginDeps(instances: DocumentService[]): void {
        instances.forEach((service) => {
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
                documentTypes,
                documentTypeResponsesToEnrich = [],
                documentTypeResponseToDocumentType,
                documentTypeToIdentityDocumentTypeResponse = {},
                documentTypeToDocumentTypeResponse,
                documentsToGetFeaturePoints = [],
                enrichDocumentsStrategiesByDocumentTypeResponse = {},
                identityDocumentTypes = [],
                syncDocumentDataStrategies = {},
            } = service

            documentTypes.forEach((documentType) => {
                Object.assign(this.getDocumentsStrategiesByDocumentType, { [documentType]: getDocuments?.bind(service) })
                Object.assign(this.getDocumentsToProcessV1StrategiesByDocumentType, {
                    [documentType]: getDocumentsToProcess ? getDocumentsToProcess.bind(service) : getDocuments?.bind(service),
                })
                Object.assign(this.deleteDocumentStrategies, deleteDocument ? { [documentType]: deleteDocument.bind(service) } : {})
            })

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
            this.documentFilters.push(...documentFilters)
            this.documentsToGetFeaturePoints.push(...documentsToGetFeaturePoints)
            this.identityDocumentTypes.push(...identityDocumentTypes)
            this.documentTypeResponsesToEnrich.push(...documentTypeResponsesToEnrich)
            merge(this.documentFiltersBySessionType, documentFiltersBySessionType)
            merge(this.documentFiltersBySessionTypeAndFeature, documentFiltersBySessionTypeAndFeature)
        })
    }
}
