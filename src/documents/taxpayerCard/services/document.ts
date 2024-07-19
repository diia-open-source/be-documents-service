import moment from 'moment'

import { Env } from '@diia-inhouse/env'
import { AccessDeniedError, BadRequestError, DocumentNotFoundError, InternalServerError } from '@diia-inhouse/errors'
import { AppUser, DocStatus, GenericData, Localization, Logger, TableBlockOrg, UserTokenData } from '@diia-inhouse/types'

import TaxpayerCardDataMapper from '@src/documents/taxpayerCard/dataMappers/document'
import TaxpayerCardPdfDataMapper from '@src/documents/taxpayerCard/dataMappers/documentPdf'
import { DocumentsDrfoServiceProvider } from '@src/documents/taxpayerCard/interfaces/providers'
import { DocumentType, DocumentTypeCamelCase, TaxpayerCard } from '@src/documents/taxpayerCard/interfaces/services'

import UserService from '@services/user'

import { DocumentIdsExpiration } from '@interfaces/models/documentsExpiration'
import { Passport } from '@interfaces/providers/eis'
import { DocumentInstance } from '@interfaces/services'
import {
    CommonDocument,
    DocumentService,
    EnrichDocumentFeature,
    EnrichDocumentsStrategy,
    EnrichDocumentsStrategyParams,
    ForceUpdateDocumentFeature,
    GetDocumentsParams,
    GetDocumentsResult,
    IsDocumentForceUpdateParams,
    SkipSaveToUserProfileConditions,
} from '@interfaces/services/documents'
import { AssertStrategyParams, DocumentVerifyParams, VerifyOtpResponse } from '@interfaces/services/documentVerification'

export default class TaxpayerCardService
    implements DocumentService<DocumentType, DocumentTypeCamelCase>, EnrichDocumentFeature, ForceUpdateDocumentFeature
{
    readonly documentTypes = [DocumentType.TaxpayerCard]

    readonly defaultSortOrder: Record<DocumentType, number> = { [DocumentType.TaxpayerCard]: 60 }

    readonly documentTypeToName: Record<DocumentType, string> = {
        [DocumentType.TaxpayerCard]: 'РНОКПП',
    }

    readonly documentTypeResponseToDocumentType: Record<DocumentTypeCamelCase, DocumentType> = {
        [DocumentTypeCamelCase.TaxpayerCard]: DocumentType.TaxpayerCard,
    }

    readonly documentTypeToDocumentTypeResponse: Record<DocumentType, DocumentTypeCamelCase> = {
        [DocumentType.TaxpayerCard]: DocumentTypeCamelCase.TaxpayerCard,
    }

    readonly documentFilters = [DocumentType.TaxpayerCard]

    readonly enrichDocumentsStrategiesByDocumentTypeResponse: Record<string, EnrichDocumentsStrategy> = {
        taxpayerCard: this.enrichDocuments.bind(this),
    }

    readonly skipSaveToUserProfileConditionsByDocumentType: Record<DocumentType, SkipSaveToUserProfileConditions> = {
        [DocumentType.TaxpayerCard]: {
            env: Env.Prod,
            docStatuses: <DocStatus[]>Object.values(DocStatus).filter((status) => status !== DocStatus.Ok),
        },
    }

    constructor(
        private readonly logger: Logger,

        private readonly userService: UserService,

        private readonly documentsDrfoProvider: DocumentsDrfoServiceProvider,

        private readonly taxpayerCardDataMapper: TaxpayerCardDataMapper,
        private readonly taxpayerCardPdfDataMapper: TaxpayerCardPdfDataMapper,
    ) {}

    async assertDocumentIsValid({ documentId, documentAssertParams }: AssertStrategyParams): Promise<void> | never {
        const { user } = documentAssertParams
        const taxpayerCard: TaxpayerCard = await this.getTaxpayerCard(user)
        if (!taxpayerCard) {
            throw new AccessDeniedError()
        }

        const match: boolean = taxpayerCard.id === documentId
        if (!match) {
            throw new DocumentNotFoundError(`There is no taxpayer card with id ${documentId}`)
        }
    }

    async checkForValidTaxpayerCard(userIdentifier: string, processCode?: number): Promise<void> {
        const hasValidTaxpayerCard = await this.userService.hasOneOfDocuments(userIdentifier, [DocumentType.TaxpayerCard])

        if (!hasValidTaxpayerCard) {
            throw new BadRequestError('Not verified taxpayer card', {}, processCode)
        }
    }

    async getDocuments(params: GetDocumentsParams): Promise<GetDocumentsResult<TaxpayerCard>> {
        const { user, designSystem } = params

        if (!user) {
            throw new InternalServerError('User must be provided')
        }

        const { card, expirationTime } = await this.documentsDrfoProvider.getTaxpayerCard(user)

        const documents = [card]
        const designSystemDocuments = designSystem ? [this.taxpayerCardDataMapper.toDocumentInstance(card)] : []

        return {
            documents,
            designSystemDocuments,
            customExpirationTime: expirationTime,
        }
    }

    async getTaxpayerCard(user: AppUser): Promise<TaxpayerCard> {
        const { card } = await this.documentsDrfoProvider.getTaxpayerCard(user)

        return card
    }

    async getValidTaxpayerCard(user: UserTokenData): Promise<TaxpayerCard | undefined> {
        const card = await this.getTaxpayerCard(user)

        return card.docStatus === DocStatus.Ok ? card : undefined
    }

    async getTaxpayerCardTableOrg(user: AppUser): Promise<TableBlockOrg> {
        const { itn } = user

        const taxpayerCard = await this.getTaxpayerCard(user)
        const { docStatus, creationDate } = taxpayerCard

        return this.taxpayerCardDataMapper.toVerifyDesignBlock(docStatus, itn, creationDate)
    }

    async enrichDocuments(documents: CommonDocument[], enrichParams: EnrichDocumentsStrategyParams): Promise<void> {
        const { user, documentsToEnrichWith } = enrichParams
        const taxpayerCards = [...documentsToEnrichWith]
        const { itn } = user

        if (taxpayerCards.length === 0) {
            try {
                const taxpayerCardItem: TaxpayerCard = await this.getTaxpayerCard(user)

                taxpayerCards.push(taxpayerCardItem)
            } catch (err) {
                this.logger.error('An error occurred on getting taxpayer cards to enrich documents', { err })
            }
        }

        if (taxpayerCards.length === 0) {
            this.logger.error('Failed to enrich documents data with taxpayer card')
        }

        const taxpayerCard = <TaxpayerCard>taxpayerCards[0]

        for (const document of documents) {
            this.enrichDocumentWithTaxpayerCard(document, {
                ...taxpayerCard,
                docStatus: taxpayerCard?.docStatus || DocStatus.Confirming,
                docNumber: taxpayerCard?.docNumber || itn,
                creationDate: taxpayerCard?.creationDate || moment().format('DD.MM.YYYY'),
            })
        }
    }

    enrichDocumentWithTaxpayerCard(document: Passport | CommonDocument, taxpayerCard: TaxpayerCard): Passport | CommonDocument {
        const { docStatus: status, docNumber: number, creationDate } = taxpayerCard

        document.taxpayerCard = {
            status,
            number,
            creationDate,
        }

        if (Localization.UA in document && document[Localization.UA]) {
            document[Localization.UA].taxpayer = this.taxpayerCardDataMapper.toEntityInDocument(
                status,
                number,
                creationDate,
                Localization.UA,
            )
        }

        if (Localization.ENG in document && document[Localization.ENG]) {
            document[Localization.ENG].taxpayer = this.taxpayerCardDataMapper.toEntityInDocument(
                status,
                number,
                creationDate,
                Localization.ENG,
            )
        }

        return document
    }

    isDocumentForceUpdate(params: IsDocumentForceUpdateParams): boolean {
        const { documentsExpiration } = params
        const taxpayerCardExpiration = (<DocumentIdsExpiration>documentsExpiration?.[DocumentType.TaxpayerCard])?.date

        if (!taxpayerCardExpiration) {
            return false
        }

        const expirationDurationYears = taxpayerCardExpiration.getFullYear() - new Date().getFullYear()

        return expirationDurationYears > 50
    }

    async verifyDocument(
        { requestor, docId }: VerifyOtpResponse,
        params: DocumentVerifyParams = {},
    ): Promise<TaxpayerCard | DocumentInstance> {
        const { designSystem } = params
        const taxpayerCard = await this.getValidTaxpayerCard(requestor)
        if (!taxpayerCard || taxpayerCard.id !== docId) {
            throw new DocumentNotFoundError(`There is no taxpayer card with docId ${docId}`)
        }

        if (designSystem) {
            return this.taxpayerCardDataMapper.toVerifyDocumentInstance(taxpayerCard)
        }

        return taxpayerCard
    }

    getSharingRenderData(document: TaxpayerCard, requester: string, requestDateTime: string, requestIdentifier: string): GenericData {
        return this.taxpayerCardPdfDataMapper.toSharingPdf(document, requester, requestDateTime, requestIdentifier)
    }
}
