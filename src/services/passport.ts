import { AnalyticsService } from '@diia-inhouse/analytics'
import { Task } from '@diia-inhouse/diia-queue'
import { AccessDeniedError, BadRequestError, DocumentNotFoundError, InternalServerError, NotFoundError } from '@diia-inhouse/errors'
import {
    AppUser,
    DocStatus,
    DocumentInstance,
    HttpStatusCode,
    Localization,
    Logger,
    PortalUserTokenData,
    SessionType,
    UserTokenData,
} from '@diia-inhouse/types'
import { utils } from '@diia-inhouse/utils'

import TaxpayerCardService from '@src/documents/taxpayerCard/services/document'
import { PassportRegistrationInfo } from '@src/generated'

import AddressService from '@services/address'

import PassportDataMapper from '@dataMappers/passportDataMapper'

import Utils from '@utils/index'

import { FindForeignPassportsOps } from '@interfaces/dataMappers/passportDataMapper'
import { PassportType, RegistryPassportDTO } from '@interfaces/dto'
import { DocumentsDmsServiceProvider, DocumentsEisServiceProvider } from '@interfaces/providers'
import { PassportByInn, PassportByInnRequester } from '@interfaces/providers/dms'
import {
    ForeignPassportInstance,
    InternalPassportInstance,
    Passport,
    PassportFull,
    Person,
    Representative,
} from '@interfaces/providers/eis'
import { RegistrationAddress } from '@interfaces/providers/usdr'
import { AnalyticsActionResult as ServiceAnalyticsActionResult, AnalyticsCategory as ServiceAnalyticsCategory } from '@interfaces/services'
import {
    DocumentWithPhoto,
    GetDocumentsContext,
    GetDocumentsParams,
    GetDocumentsResult,
    IdentityDocument,
} from '@interfaces/services/documents'
import {
    AssertStrategyParams,
    DocumentVerifyParams,
    PassportAssertParams,
    VerifyOtpResponse,
} from '@interfaces/services/documentVerification'
import { RegistrationSource } from '@interfaces/services/passport'
import { ServiceTask } from '@interfaces/tasks'
import { EventPayload } from '@interfaces/tasks/publishAdultRegistrationAddressCommunity'

export default class PassportService {
    constructor(
        private readonly addressService: AddressService,
        private readonly taxpayerCardService: TaxpayerCardService,

        private readonly documentsEisProvider: DocumentsEisServiceProvider,
        private readonly documentsDmsProvider: DocumentsDmsServiceProvider,

        private readonly passportDataMapper: PassportDataMapper,

        private readonly appUtils: Utils,

        private readonly analytics: AnalyticsService,
        private readonly task: Task,
        private readonly logger: Logger,
    ) {}

    async assertDocumentIsValid({ documentId, documentAssertParams }: AssertStrategyParams): Promise<void> | never {
        const { user, passportType } = <PassportAssertParams>documentAssertParams
        const documents: Passport[] = await this.getPassportsEntity(user)
        if (!documents.length) {
            throw new AccessDeniedError()
        }

        const isEligibleForSharing = documents.find(({ id, type }: Passport) => id === documentId && type === passportType)
        if (!isEligibleForSharing) {
            throw new DocumentNotFoundError(`There is no passport document with id ${documentId}`)
        }
    }

    async getIdentityDocument(user: AppUser): Promise<IdentityDocument | undefined> {
        const passport = await this.getPassportToProcess(user)
        if (!passport) {
            return
        }

        const identityType = this.passportDataMapper.mapPassportTypeToIdentityDocumentType[passport.type]

        return { ...passport, identityType }
    }

    async getInternalPassportDocuments(params: GetDocumentsParams): Promise<GetDocumentsResult<InternalPassportInstance>> {
        const { user, context, designSystem } = params

        if (!user) {
            throw new InternalServerError('User must be provided')
        }

        const passportsPromise = this.getPassportsEntityByContext(context, user)
        const documents = await this.getInternalPassportFromPromise(passportsPromise)

        if (designSystem) {
            const passportsRaw = await this.getPassportsByContext(context, user)
            if (!passportsRaw) {
                throw new DocumentNotFoundError()
            }

            const taxpayerCardTableOrg = await context.promisedTaxpayerCardTableOrg
            if (!taxpayerCardTableOrg) {
                throw new InternalServerError('TaxpayerCardTableOrg not found')
            }

            return {
                documents,
                designSystemDocuments: this.passportDataMapper.toDocumentInstance(PassportType.ID, passportsRaw, taxpayerCardTableOrg),
            }
        }

        return { documents, designSystemDocuments: [] }
    }

    async getInternalPassportToProcess(user: UserTokenData): Promise<InternalPassportInstance> {
        const passports: Passport[] = await this.getPassportsEntity(user)

        return this.passportDataMapper.findIdCard(passports)
    }

    async getForeignPassportDocuments(params: GetDocumentsParams): Promise<GetDocumentsResult<ForeignPassportInstance>> {
        const { user, context, designSystem } = params

        if (!user) {
            throw new InternalServerError('User must be provided')
        }

        const passportsPromise = this.getPassportsEntityByContext(context, user)
        const documents = await this.getForeignPassportFromPromise(passportsPromise, { sortByDate: true })

        if (designSystem) {
            const passportsRaw = await this.getPassportsByContext(context, user)
            if (!passportsRaw) {
                throw new DocumentNotFoundError()
            }

            const taxpayerCardTableOrg = await context.promisedTaxpayerCardTableOrg
            if (!taxpayerCardTableOrg) {
                throw new InternalServerError('TaxpayerCardTableOrg not found')
            }

            return {
                documents,
                designSystemDocuments: this.passportDataMapper.toDocumentInstance(PassportType.P, passportsRaw, taxpayerCardTableOrg),
            }
        }

        return { documents, designSystemDocuments: [] }
    }

    async getPassportFull(user: UserTokenData): Promise<PassportFull> {
        const person: Person = this.appUtils.collectPerson(user)
        const representative: Representative = this.appUtils.collectRepresentative(user)

        return await this.documentsEisProvider.getPassportFull(person, representative)
    }

    async getPassportByInn(user: PassportByInnRequester): Promise<PassportByInn> {
        return await this.documentsDmsProvider.getPassport(user)
    }

    async getPassportsEntityByContext(
        context: GetDocumentsContext,
        user: AppUser,
        customRepresentative?: Representative,
    ): Promise<Passport[]> {
        const passportsRaw = await this.getPassportsByContext(context, user, customRepresentative)
        if (!passportsRaw) {
            return []
        }

        return this.passportDataMapper.toDocumentInstanceV1(passportsRaw)
    }

    async getPassportsByPerson(person: Person, representative: Representative): Promise<Passport[]> {
        const passports = await this.documentsEisProvider.getPassports(person, representative)

        return this.passportDataMapper.toDocumentInstanceV1(passports)
    }

    async getPassportsEntity(user: AppUser, customRepresentative?: Representative): Promise<Passport[]> {
        const passportsRaw = await this.getPassports(user, customRepresentative)
        if (!passportsRaw) {
            return []
        }

        return this.passportDataMapper.toDocumentInstanceV1(passportsRaw)
    }

    async getPassportToProcess(user: AppUser): Promise<Passport | undefined> {
        const passports = await this.getPassportsEntity(user)
        const internalPassport = this.passportDataMapper.findIdCard(passports)

        if (internalPassport) {
            return internalPassport
        }

        const [foreignPassport] = this.passportDataMapper.findForeignPassports(passports, {
            sortByDate: true,
        })

        return foreignPassport
    }

    async getRegistration(
        user: UserTokenData,
        sources: RegistrationSource[] = ['passport', 'passportByInn'],
    ): Promise<PassportRegistrationInfo | undefined> {
        if (sources.includes('passport')) {
            const passportRegistration = await this.getRegistrationFromPassports(user)

            if (passportRegistration) {
                return await this.enrichRegistrationAddressWithCodes(passportRegistration)
            }
        }

        if (sources.includes('passportByInn')) {
            const passportByInnRegistration = await this.getRegistrationFromPassportByInn(user)

            if (passportByInnRegistration) {
                return await this.enrichRegistrationAddressWithCodes(passportByInnRegistration)
            }
        }
    }

    async getRegistrationPlaceForPassport(user: UserTokenData): Promise<string> {
        const passports: Passport[] = await this.getPassportsEntity(user)
        const idCard: InternalPassportInstance = this.passportDataMapper.findIdCard(passports)
        const foreignPassports: ForeignPassportInstance[] = this.passportDataMapper.findForeignPassports(passports, { sortByDate: true })

        return idCard?.currentRegistrationPlaceUA || foreignPassports[0]?.currentRegistrationPlaceUA
    }

    async getRegistrationInfoFromPassports(user: PortalUserTokenData): Promise<RegistrationAddress> {
        const person: Person = { rnokpp: user.itn }

        const passports = await this.documentsEisProvider.getPassports(person, this.appUtils.collectRepresentative(user))

        const registrationAddress = this.passportDataMapper.getRegistrationAddress(passports)
        if (!registrationAddress) {
            throw new NotFoundError('No passport registration')
        }

        return registrationAddress
    }

    enrichDocumentWithPhoto<T extends DocumentWithPhoto>(
        document: T,
        passports: Passport[] = [],
        category?: ServiceAnalyticsCategory,
        action?: string,
        analyticsData?: Record<string, unknown>,
    ): T {
        this.logger.info('Start extracting photo from passports', { docId: document.id })

        const photo = this.extractPhotoFromPassports(passports)

        if (category && action && analyticsData) {
            const actionResult = photo ? ServiceAnalyticsActionResult.Success : ServiceAnalyticsActionResult.Error

            this.analytics.log(category, action, actionResult, analyticsData)
        }

        if (photo) {
            document.photo = photo
            document.docStatus = DocStatus.Ok
        } else {
            this.logger.error('Could not find photo from passports', { docId: document.id })
        }

        return document
    }

    extractPhotoFromPassports(passports: Passport[]): string | undefined {
        if (!passports.length) {
            return
        }

        const internalPassport: InternalPassportInstance = this.passportDataMapper.findIdCard(passports)

        const [foreignPassport]: ForeignPassportInstance[] = this.passportDataMapper
            .findForeignPassports(passports, { sortByDate: true })
            .filter((passport: ForeignPassportInstance) => passport.photo)

        return foreignPassport?.photo || internalPassport?.photo
    }

    async verifyInternalPassport(
        verifyOTPResponse: VerifyOtpResponse,
        params: DocumentVerifyParams = {},
    ): Promise<Passport | DocumentInstance> {
        const { designSystem } = params

        const internalPassport = await this.verifyPassport(verifyOTPResponse, PassportType.ID, params?.representative)

        if (designSystem) {
            const localization = verifyOTPResponse.localization || Localization.UA

            return this.passportDataMapper.toVerifyDocumentInstance(internalPassport, localization)
        }

        return internalPassport
    }

    async verifyForeignPassport(
        verifyOTPResponse: VerifyOtpResponse,
        params: DocumentVerifyParams = {},
    ): Promise<Passport | DocumentInstance> {
        const { designSystem } = params

        const foreignPassport = await this.verifyPassport(verifyOTPResponse, PassportType.P, params?.representative)

        if (designSystem) {
            if (!verifyOTPResponse.localization) {
                throw new BadRequestError('Localization is not provided for design system')
            }

            return this.passportDataMapper.toVerifyDocumentInstance(foreignPassport, verifyOTPResponse.localization)
        }

        return foreignPassport
    }

    private async getPassportsByContext(
        context: GetDocumentsContext,
        user: AppUser,
        customRepresentative?: Representative,
    ): Promise<RegistryPassportDTO | undefined> {
        if (!context.promisedPassports) {
            context.promisedPassports = this.getPassports(user, customRepresentative)
        }

        return await context.promisedPassports
    }

    private async getPassports(user: AppUser, customRepresentative?: Representative): Promise<RegistryPassportDTO | undefined> {
        const { itn, lName, fName, mName, birthDay, identifier: userIdentifier, sessionType, gender } = user
        if (sessionType !== SessionType.User) {
            return
        }

        const person = this.appUtils.collectPerson(user)
        const representative = customRepresentative || this.appUtils.collectRepresentative(user)

        try {
            const passports = await this.documentsEisProvider.getPassports(person, representative)
            const registrationAddress = this.passportDataMapper.getRegistrationAddress(passports)

            await this.task.publish(ServiceTask.PublishAdultRegistrationAddressCommunity, <EventPayload>{
                userIdentifier,
                itn,
                lName,
                fName,
                mName,
                birthDay,
                gender,
                koatuu: registrationAddress?.koatuu,
                communityKodificatorCode: registrationAddress?.communityCode,
            })

            return passports
        } catch (err) {
            return await utils.handleError(err, async (apiErr) => {
                if (apiErr.getCode() === HttpStatusCode.NOT_FOUND) {
                    await Promise.all([
                        this.task.publish(ServiceTask.PublishAdultRegistrationAddressCommunity, <EventPayload>{
                            userIdentifier,
                            itn,
                            lName,
                            fName,
                            mName,
                            birthDay,
                            gender,
                        }),
                    ])

                    return undefined
                }

                throw err
            })
        }
    }

    private async enrichRegistrationAddressWithCodes(registration: PassportRegistrationInfo): Promise<PassportRegistrationInfo> {
        const { address } = registration

        if (!address) {
            return registration
        }

        const { addressKoatuu, addressKatottg, addressGromKatottg } = address

        if (addressKatottg && addressGromKatottg) {
            return registration
        }

        if (addressKatottg && !addressGromKatottg) {
            return await this.enrichRegistrationAddressByKatottg(registration, addressKatottg)
        }

        if (!addressKoatuu) {
            return registration
        }

        return await this.enrichRegistrationAddressByKoatuu(registration, addressKoatuu)
    }

    private async enrichRegistrationAddressByKatottg(
        registration: PassportRegistrationInfo,
        addressKatottg: string,
    ): Promise<PassportRegistrationInfo> {
        try {
            const communityCode = await this.addressService.findCommunityCodeByKodificatorCode(addressKatottg)

            return {
                ...registration,
                address: {
                    ...registration.address,
                    addressGromKatottg: communityCode,
                },
            }
        } catch (err) {
            this.logger.error('Failed to find community code for registration address', { err })

            return registration
        }
    }

    private async enrichRegistrationAddressByKoatuu(
        registration: PassportRegistrationInfo,
        addressKoatuu: string,
    ): Promise<PassportRegistrationInfo> {
        try {
            const codifier = await this.addressService.findCodifierByKoatuu(addressKoatuu)

            return {
                ...registration,
                address: {
                    ...registration.address,
                    addressKatottg: registration.address?.addressKatottg || codifier.level,
                    addressGromKatottg: registration.address?.addressGromKatottg || codifier.thirdLevel,
                },
            }
        } catch (err) {
            this.logger.error('Failed to find codifier for registration address', { err })

            return registration
        }
    }

    private async getForeignPassportFromPromise(
        promisedPassports: Promise<Passport[]>,
        ops: FindForeignPassportsOps = {},
    ): Promise<ForeignPassportInstance[]> {
        const passports: Passport[] = await promisedPassports

        const documents: ForeignPassportInstance[] = this.passportDataMapper.findForeignPassports(passports, ops)
        if (!documents.length) {
            throw new DocumentNotFoundError()
        }

        return documents
    }

    private async getInternalPassportFromPromise(promisedPassports: Promise<Passport[]>): Promise<InternalPassportInstance[]> {
        const passports: Passport[] = await promisedPassports

        const internalPassport: InternalPassportInstance = this.passportDataMapper.findIdCard(passports)
        if (!internalPassport) {
            throw new DocumentNotFoundError()
        }

        return [internalPassport]
    }

    private async getPassport(
        user: UserTokenData,
        type: PassportType,
        docId: string,
        customRepresentative?: Representative,
    ): Promise<Passport | undefined> {
        const passports = await this.getPassportsEntity(user, customRepresentative)

        switch (type) {
            case PassportType.ID: {
                const idCard: InternalPassportInstance = this.passportDataMapper.findIdCard(passports)
                // SPIKE: because of registry change date_issue (add delimiter '-')
                const idCardDocumentId: string = idCard?.id.replace('-', '')
                const requestDocumentId: string = docId.replace('-', '')

                return idCardDocumentId === requestDocumentId ? idCard : undefined
            }
            case PassportType.P: {
                const foreignPassports: ForeignPassportInstance[] = this.passportDataMapper.findForeignPassports(passports)

                return foreignPassports.find((passport: ForeignPassportInstance) => passport.id === docId)
            }
            default: {
                const unknownType: never = type

                throw new TypeError(`Unknown passport type ${unknownType}`)
            }
        }
    }

    private async getRegistrationFromPassportByInn(user: UserTokenData): Promise<PassportRegistrationInfo | undefined> {
        try {
            const { registration } = await this.getPassportByInn(user)

            this.logger.info('Get registration address from passportByInn')

            return registration
        } catch (err) {
            utils.handleError(err, (apiErr) => {
                if (apiErr.getCode() !== HttpStatusCode.NOT_FOUND) {
                    throw apiErr
                }

                this.logger.warn('Registration address from passportByInn not found')
            })
        }
    }

    private async getRegistrationFromPassports(user: UserTokenData): Promise<PassportRegistrationInfo | undefined> {
        try {
            const person: Person = this.appUtils.collectPerson(user)
            const representative: Representative = this.appUtils.collectRepresentative(user)

            const passports = await this.documentsEisProvider.getPassports(person, representative)

            this.logger.info('Get registration address from passports')

            return this.passportDataMapper.toRegistration(passports)
        } catch (err) {
            utils.handleError(err, (apiErr) => {
                if (apiErr.getCode() !== HttpStatusCode.NOT_FOUND) {
                    throw apiErr
                }

                this.logger.info('Registration address from passports not found')
            })
        }
    }

    private async verifyPassport(
        verifyOTPResponse: VerifyOtpResponse,
        type: PassportType,
        customRepresentative?: Representative,
    ): Promise<Passport> {
        const { requestor, docId, localization } = verifyOTPResponse
        const passport = await this.getPassport(requestor, type, docId, customRepresentative)

        if (!passport) {
            throw new DocumentNotFoundError(`There is no passport type [${type}] with docId ${docId}`)
        }

        const taxpayerCard = await this.taxpayerCardService.getTaxpayerCard(requestor)

        passport.shareLocalization = localization

        this.taxpayerCardService.enrichDocumentWithTaxpayerCard(passport, taxpayerCard)

        return passport
    }
}
