import { AccessDeniedError, BadRequestError, DocumentNotFoundError, InternalServerError } from '@diia-inhouse/errors'
import { AppUser, DocStatus, DocumentInstance, DocumentType, DriverLicense, Localization, Logger, UserTokenData } from '@diia-inhouse/types'

import DriverLicenseDataMapper from '@src/documents/driverLicense/dataMappers/document'
import { DriverLicenseHscServiceProvider } from '@src/documents/driverLicense/interfaces/providers'
import { DriverLicenseFull } from '@src/documents/driverLicense/interfaces/providers/hsc'
import { AnalyticsActionType } from '@src/documents/driverLicense/interfaces/services/analytics'
import { DriverLicenseAssertParams } from '@src/documents/driverLicense/interfaces/services/documentVerification'

import PassportService from '@services/passport'

import { Passport } from '@interfaces/providers/eis'
import { AnalyticsCategory as ServiceAnalyticsCategory } from '@interfaces/services'
import { DefaultValue, DocumentService, GetDocumentsContext, GetDocumentsParams, GetDocumentsResult } from '@interfaces/services/documents'
import { AssertStrategyParams, DocumentVerifyParams, VerifyOtpResponse } from '@interfaces/services/documentVerification'

export default class DriverLicenseService implements DocumentService {
    readonly documentTypes = [DocumentType.DriverLicense]

    readonly documentTypeToDocumentTypeResponse = {
        [DocumentType.DriverLicense]: 'driverLicense',
    }

    readonly documentTypeResponseToDocumentType = {
        driverLicense: DocumentType.DriverLicense,
    }

    readonly documentFilters: DocumentType[] = this.documentTypes

    readonly validDocStatusesByDocumentType: Partial<Record<DocumentType, DocStatus[]>> = {
        [DocumentType.DriverLicense]: [DocStatus.Ok, DocStatus.NoPhoto],
    }

    constructor(
        private readonly logger: Logger,
        private readonly passportService: PassportService,
        private readonly driverLicenseHscProvider: DriverLicenseHscServiceProvider,
        private readonly driverLicenseDataMapper: DriverLicenseDataMapper,
    ) {}

    async assertDocumentIsValid({ documentId, documentAssertParams }: AssertStrategyParams): Promise<void> | never {
        const { itn } = <DriverLicenseAssertParams>documentAssertParams
        const documents: DriverLicense[] = await this.getDriverLicenses(itn)
        if (!documents.length) {
            throw new AccessDeniedError()
        }

        const isLicenseEligibleForSharing = documents.find((driverLicense: DriverLicense) => driverLicense.id === documentId)
        if (!isLicenseEligibleForSharing) {
            throw new DocumentNotFoundError(`There is no driver license document with id ${documentId}`)
        }
    }

    async getDocuments(params: GetDocumentsParams): Promise<GetDocumentsResult<DriverLicense>> {
        const { itn, designSystem, user, context } = params

        const [[passport], driverLicenseDto] = await Promise.all([
            user ? this.getPassports(user, context) : [],
            this.driverLicenseHscProvider.getDriverLicense(itn),
        ])

        const unzr = passport?.recordNumber

        const documents = this.driverLicenseDataMapper.toDocumentInstanceV1(driverLicenseDto, unzr)
        const designSystemDocuments = designSystem ? this.driverLicenseDataMapper.toDocumentInstance(driverLicenseDto, unzr) : []

        return { documents, designSystemDocuments }
    }

    async getDocumentsToProcess(params: GetDocumentsParams): Promise<GetDocumentsResult<DriverLicense>> {
        const { itn, user, context } = params

        if (!user) {
            throw new InternalServerError('User is not defined')
        }

        const passports = await this.getPassports(user, context)
        const documents = await this.getDriverLicenses(itn, passports[0])

        const documentsWithPhoto = documents.map((document) =>
            document.docStatus === DocStatus.NoPhoto ? this.passportService.enrichDocumentWithPhoto(document, passports) : document,
        )

        return { documents: documentsWithPhoto, designSystemDocuments: [] }
    }

    async getDocumentsWithPhoto(params: GetDocumentsParams): Promise<GetDocumentsResult<DriverLicense>> {
        const { itn, user, context } = params

        if (!user) {
            throw new InternalServerError('User is not defined')
        }

        const passports = await this.getPassports(user, context)
        const documents = await this.getDriverLicenses(itn, passports[0])

        const documentsWithPhoto = documents.map((document) =>
            document.docStatus === DocStatus.NoPhoto ? this.passportService.enrichDocumentWithPhoto(document, passports) : document,
        )

        return { documents: documentsWithPhoto, designSystemDocuments: [] }
    }

    async getDriverLicenses(
        itn: string,
        passport?: Passport,
        fieldsDefaultValue: DefaultValue | null = DefaultValue.NotProvided,
        ignoreCache?: boolean,
    ): Promise<DriverLicense[]> {
        const driverLicenseDto = await this.driverLicenseHscProvider.getDriverLicense(itn, ignoreCache)

        return this.driverLicenseDataMapper.toDocumentInstanceV1(driverLicenseDto, passport?.recordNumber, fieldsDefaultValue)
    }

    async getDriverLicenseFull(itn: string): Promise<DriverLicenseFull> {
        return await this.driverLicenseHscProvider.getDriverLicenseFull(itn)
    }

    async verifyDocument(
        { docId, requestor, docStatus, localization }: VerifyOtpResponse,
        params: DocumentVerifyParams = {},
    ): Promise<DriverLicense | DocumentInstance> {
        const { designSystem } = params
        const passports = await this.getPassports(requestor)
        const driverLicense = await this.getDriverLicense(requestor, docId, passports?.[0])

        if (!driverLicense) {
            throw new BadRequestError('DriverLicense is not found')
        }

        driverLicense.shareLocalization = localization

        if (docStatus === DocStatus.NoPhoto) {
            const driverLicenseWithPhotoFromPassport = this.passportService.enrichDocumentWithPhoto(
                driverLicense,
                passports,
                ServiceAnalyticsCategory.VerificationDocuments,
                AnalyticsActionType.GetPassportForDriverLicense,
                { driverLicenseId: docId },
            )

            return this.verifyDriverLicenseDocument(driverLicenseWithPhotoFromPassport, designSystem, localization)
        }

        return this.verifyDriverLicenseDocument(driverLicense, designSystem, localization)
    }

    private async getDriverLicense(user: UserTokenData, docId: string, passport?: Passport): Promise<DriverLicense | undefined> {
        const documents = await this.getDriverLicenses(user.itn, passport)

        return documents.find((document) => document.id === docId)
    }

    private async getPassports(user: AppUser, context: GetDocumentsContext = {}): Promise<Passport[]> {
        try {
            return await this.passportService.getPassportsEntityByContext(context, user)
        } catch (err) {
            this.logger.error('Failed to find passports for driver license', { err })

            return []
        }
    }

    private verifyDriverLicenseDocument(
        driverLicense: DriverLicense,
        designSystem?: boolean,
        localization?: Localization,
    ): DocumentInstance | DriverLicense {
        if (designSystem) {
            if (!localization) {
                throw new BadRequestError('Localization is not provided for design system')
            }

            return this.driverLicenseDataMapper.toVerifyDocumentInstance(driverLicense, localization)
        }

        return driverLicense
    }
}
