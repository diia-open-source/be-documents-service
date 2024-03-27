import { randomUUID as uuid } from 'node:crypto'

import { PluginDepsCollection } from '@diia-inhouse/diia-app'

import {
    AnalyticsActionResult,
    AnalyticsActionType,
    AnalyticsCategory,
    AnalyticsService as CoreAnalyticsService,
} from '@diia-inhouse/analytics'
import { AuthService } from '@diia-inhouse/crypto'
import { ApiError, BadRequestError, DocumentNotFoundError, NotFoundError } from '@diia-inhouse/errors'
import { ActHeaders, DocStatus, DocumentInstance, DocumentType, Localization, Logger, OwnerType, UserTokenData } from '@diia-inhouse/types'
import { utils } from '@diia-inhouse/utils'

import AnalyticsService from '@services/analytics'
import DocumentsExpirationService from '@services/documentsExpiration'
import DocumentVerificationOtpService from '@services/documentVerificationOtp'
import PassportService from '@services/passport'

import DocumentVerificationDataMapper from '@dataMappers/documentVerificationDataMapper'

import { AppConfig } from '@interfaces/config'
import { DocumentVerificationOtp, DocumentVerificationOtpModel } from '@interfaces/models/documentVerificationOtp'
import { AnalyticsCategory as ServiceAnalyticsCategory } from '@interfaces/services'
import { CommonDocument, Document, DocumentService } from '@interfaces/services/documents'
import {
    AssertParams,
    AssertStrategy,
    DocumentTypeDefinerByQrCodeStrategy,
    GetValidatedVerificationRecordResult,
    ShareLinkParams,
    ShareLinkResponse,
    StillValidResult,
    VerificationByDataStrategy,
    VerificationData,
    VerificationStrategy,
    VerifyDocumentParams,
} from '@interfaces/services/documentVerification'

export default class DocumentVerificationService {
    private readonly assertStrategies: Partial<Record<DocumentType, AssertStrategy>> = {
        [DocumentType.ForeignPassport]: this.passportService.assertDocumentIsValid.bind(this.passportService),
        [DocumentType.InternalPassport]: this.passportService.assertDocumentIsValid.bind(this.passportService),
    }

    private readonly verifyStrategies: Partial<Record<DocumentType, VerificationStrategy>> = {
        [DocumentType.ForeignPassport]: this.passportService.verifyForeignPassport.bind(this.passportService),
        [DocumentType.InternalPassport]: this.passportService.verifyInternalPassport.bind(this.passportService),
    }

    private readonly validDocStatusesByDocumentType: Partial<Record<DocumentType, DocStatus[]>> = {}

    private readonly timerTextByLocalization: Record<Localization, string> = {
        [Localization.UA]: 'Код діятиме ще',
        [Localization.ENG]: 'The code will expire in',
    }

    private readonly defineDocumentTypeByQrCodeStrategies: DocumentTypeDefinerByQrCodeStrategy[] = []

    private readonly verifyByDataStrategies: Partial<Record<DocumentType, VerificationByDataStrategy>> = {}

    constructor(
        private readonly analyticsService: AnalyticsService,
        private readonly documentServices: PluginDepsCollection<DocumentService>,
        private readonly documentsExpirationService: DocumentsExpirationService,
        private readonly documentVerificationOtpService: DocumentVerificationOtpService,
        private readonly passportService: PassportService,

        private readonly documentVerificationDataMapper: DocumentVerificationDataMapper,

        private readonly config: AppConfig,
        private readonly analytics: CoreAnalyticsService,
        private readonly auth: AuthService,
        private readonly logger: Logger,
    ) {
        this.loadPluginDeps(this.documentServices.items)
        this.documentServices.on('newItems', (instances) => this.loadPluginDeps(instances))
    }

    async generateOtpLink({
        documentType,
        documentId,
        headers,
        userIdentifier,
        documentAssertParams,
        generateBarcode = false,
        localization = Localization.UA,
    }: ShareLinkParams): Promise<ShareLinkResponse> {
        this.logger.info('Start generating OTP link', { documentType })

        const { mobileUid, token } = headers
        const { ownerType, docStatus }: StillValidResult = await this.assertDocumentIsValid(
            documentId,
            documentType,
            mobileUid,
            userIdentifier,
            documentAssertParams,
        )
        const { expirationDate, expirationSec, hash } = this.prepareDataToPersist()

        this.logger.info('Start saving otp to the database', { documentId, expirationDate, documentType })

        const data: DocumentVerificationOtp = {
            userIdentifier,
            documentId,
            requestorJWE: token!,
            registryDocumentType: documentType,
            hash,
            ownerType,
            docStatus,
            expirationDate,
            localization,
        }
        const verificationOtp = await this.documentVerificationOtpService.create(data, generateBarcode)
        const docVerificationLink = this.buildDocumentVerificationLink(documentType, documentId, hash)

        this.logger.info('Data successfully saved to the database', { docVerificationLink })

        this.analytics.userAcquirerLog(
            AnalyticsCategory.AcquirersRequest,
            userIdentifier,
            undefined,
            AnalyticsActionType.Booking,
            AnalyticsActionResult.Booked,
            headers,
            { request: hash, scopes: [documentType] },
        )

        return {
            id: verificationOtp.id,
            link: docVerificationLink,
            barcode: verificationOtp.barcode,
            timerText: this.timerTextByLocalization[localization],
            timerTime: expirationSec,
        }
    }

    async verifyDocument<T extends CommonDocument | DocumentInstance>({
        otp,
        documentType,
        token,
        ...verifyParams
    }: VerifyDocumentParams): Promise<T> {
        this.logger.info('Start verify document', { documentType })

        let document: Document | undefined
        let error: ApiError | undefined
        let documentId: string | undefined

        try {
            const record = await this.documentVerificationOtpService.findByKey({ hash: otp })

            if (!record) {
                throw new NotFoundError('VerificationOtp is not found')
            }

            documentId = record.documentId

            const verifyOTPResponse = await this.documentVerificationOtpService.verifyOtp(record, token, documentType)

            const verificator = this.verifyStrategies[documentType]
            if (!verificator) {
                throw new Error(`VerifyStrategy for ${documentType} is not defined`)
            }

            return <T>await verificator(verifyOTPResponse, { ...verifyParams, documentType })
        } catch (err) {
            return utils.handleError(err, (apiError) => {
                error = apiError

                throw apiError
            })
        } finally {
            const actionType = this.analyticsService.getDocumentActionTypeByDocumentType[documentType] || ''

            if (!actionType) {
                this.logger.info('Unexpected actionType', { documentType })
            }

            this.analytics.log(
                ServiceAnalyticsCategory.VerificationDocuments,
                actionType,
                this.analyticsService.getActionResult(document?.docStatus, error?.getCode()),
                { documentId },
            )
        }
    }

    async verifyDocumentByBarcode(documentType: DocumentType, barcode: string): Promise<Document> {
        const verifyOTPResponse = await this.documentVerificationOtpService.verifyOTPByBarcode(barcode, '')

        const verificator = this.verifyStrategies[documentType]

        if (!verificator) {
            throw new BadRequestError(`Verify strategy for ${documentType} is not defined`)
        }

        return <Document>await verificator(verifyOTPResponse, { documentType })
    }

    async getDocumentByBarcode(documentType: DocumentType, barcode: string): Promise<Document> {
        const verification = await this.documentVerificationOtpService.findByKey({ barcode })

        if (!verification) {
            throw new NotFoundError(`Verification not found by barcode: ${barcode}`)
        }

        const verificator = this.verifyStrategies[documentType]

        if (!verificator) {
            throw new BadRequestError(`Verify strategy for ${documentType} is not defined`)
        }

        const otpResponse = await this.documentVerificationDataMapper.toVerifyOtpResponse(verification)

        return <Document>await verificator(otpResponse, { documentType })
    }

    async verifyDocumentByData<T extends DocumentInstance>(
        data: { qrCode: string },
        headers: ActHeaders,
        designSystem = false,
    ): Promise<T> {
        const { qrCode } = data

        for (const defineDocumentTypeByQrCode of this.defineDocumentTypeByQrCodeStrategies) {
            const documentType = defineDocumentTypeByQrCode(qrCode)
            if (!documentType) {
                continue
            }

            const verificator = this.verifyByDataStrategies[documentType]
            if (!verificator) {
                throw new BadRequestError(`Verify by data strategy for ${documentType} is not defined`)
            }

            return <T>await verificator(qrCode, headers, designSystem)
        }

        throw new BadRequestError('Not valid data for verification')
    }

    async getValidatedVerificationRecordByBarcode(barcode: string): Promise<GetValidatedVerificationRecordResult> {
        const record = await this.documentVerificationOtpService.findByKey({ barcode })

        return await this.getValidatedVerificationRecord(record)
    }

    async getValidatedVerificationRecordByOtp(hash: string): Promise<GetValidatedVerificationRecordResult> {
        const record = await this.documentVerificationOtpService.findByKey({ hash })

        return await this.getValidatedVerificationRecord(record)
    }

    private async assertDocumentIsValid(
        documentId: string,
        documentType: DocumentType,
        mobileUid: string,
        userIdentifier: string,
        documentAssertParams: AssertParams,
    ): Promise<StillValidResult> {
        if ([DocumentType.InternalPassport, DocumentType.ForeignPassport].includes(documentType)) {
            return { isStillValid: true, docStatus: DocStatus.Ok, ownerType: OwnerType.owner }
        }

        const { checkExpirationDocumentType = documentType } = documentAssertParams
        const stillValidResult: StillValidResult = await this.checkIsDocumentStillValid(
            mobileUid,
            userIdentifier,
            documentId,
            checkExpirationDocumentType,
        )
        const { isStillValid, ownerType } = stillValidResult
        if (isStillValid) {
            return stillValidResult
        }

        const assertDocument = this.assertStrategies[documentType]

        if (!assertDocument) {
            throw new BadRequestError(`AssertStrategy for ${documentType} is not defined`)
        }

        await assertDocument({ documentId, documentType, ownerType, documentAssertParams })

        return stillValidResult
    }

    private async collectVerificationData(documentVerification: DocumentVerificationOtpModel): Promise<VerificationData> {
        const { registryDocumentType, expirationDate, usedDate, hash, requestorJWE, documentId, userIdentifier, barcode } =
            documentVerification
        const requestor: UserTokenData = <UserTokenData>await this.auth.decodeToken(requestorJWE)
        const { mobileUid, birthDay, fName: firstName, mName: middleName, lName: lastName } = requestor

        return {
            registryDocumentType,
            expirationDate,
            usedDate,
            barcode: barcode!,
            otp: hash,
            requestorJWE,
            mobileUid,
            birthDay,
            firstName,
            middleName,
            lastName,
            documentId,
            userIdentifier,
        }
    }

    private async getValidatedVerificationRecord(
        record: DocumentVerificationOtpModel | null,
    ): Promise<GetValidatedVerificationRecordResult> {
        let isValid = true
        let errorMessage = ''
        let verification: VerificationData | undefined
        try {
            this.documentVerificationOtpService.assertRecordIsValid(record)
        } catch (err) {
            await utils.handleError(err, (apiError) => {
                isValid = false
                errorMessage = apiError.getMessage()
            })
        } finally {
            if (record) {
                verification = await this.collectVerificationData(record)
            }
        }

        return { isValid, errorMessage, verification }
    }

    private prepareDataToPersist(): { hash: string; expirationDate: Date; expirationSec: number } {
        const hash = uuid()
        const expirationMs = this.config.app.documentVerificationLinkExpirationMS
        const expirationDate = new Date(Date.now() + expirationMs)

        return { hash, expirationDate, expirationSec: Math.round(expirationMs / 1000) }
    }

    private buildDocumentVerificationLink(documentType: DocumentType, docId: string, hash: string): string {
        return `https://diia.app/documents/${documentType}/${docId}/verify/${hash}`
    }

    private async checkIsDocumentStillValid(
        mobileUid: string,
        userIdentifier: string,
        documentId: string,
        documentType: DocumentType,
    ): Promise<StillValidResult> {
        this.logger.info('Start checking is document still valid', { documentId, documentType })

        const expiration = await this.documentsExpirationService.getDocumentIdsExpiration(mobileUid, userIdentifier, documentType)

        const documentStatus = expiration?.statuses?.[documentId]
        if (!documentStatus) {
            this.logger.error('Document expiration record not found', { mobileUid, documentId, documentType })

            throw new BadRequestError('Firstly request document before sharing')
        }

        const { value, ownerType } = documentStatus

        if (!this.isDocStatusValid(documentType, value)) {
            throw new DocumentNotFoundError(`There is no document with id ${documentId}`)
        }

        const currentDate: Date = new Date()
        const expirationDate: Date = expiration.date

        this.logger.info('Validation dates:', {
            currentDate: currentDate.toISOString(),
            expirationDate: expirationDate.toISOString(),
            documentId,
            documentType,
        })

        return { isStillValid: currentDate <= expirationDate, ownerType, docStatus: value }
    }

    private isDocStatusValid(documentType: DocumentType, docStatus: DocStatus): boolean {
        const validStatuses = this.validDocStatusesByDocumentType[documentType] || [DocStatus.Ok]

        return validStatuses.includes(docStatus)
    }

    private loadPluginDeps(instances: DocumentService[]): void {
        instances.forEach((service) => {
            const {
                documentTypes,
                assertDocumentIsValid,
                verifyDocument,
                verifyDocumentByData,
                defineDocumentTypeByQrCode,
                validDocStatusesByDocumentType = {},
            } = service

            documentTypes.forEach((documentType) => {
                Object.assign(this.assertStrategies, assertDocumentIsValid ? { [documentType]: assertDocumentIsValid.bind(service) } : {})
                Object.assign(this.verifyStrategies, verifyDocument ? { [documentType]: verifyDocument.bind(service) } : {})
                Object.assign(
                    this.verifyByDataStrategies,
                    verifyDocumentByData ? { [documentType]: verifyDocumentByData.bind(service) } : {},
                )
            })
            Object.assign(this.validDocStatusesByDocumentType, validDocStatusesByDocumentType)
            if (defineDocumentTypeByQrCode) {
                this.defineDocumentTypeByQrCodeStrategies.push(defineDocumentTypeByQrCode)
            }
        })
    }
}
