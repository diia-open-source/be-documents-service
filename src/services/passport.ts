import { AnalyticsService } from '@diia-inhouse/analytics'
import { Task } from '@diia-inhouse/diia-queue'
import { AccessDeniedError, BadRequestError, DocumentNotFoundError, InternalServerError, NotFoundError } from '@diia-inhouse/errors'
import {
    AppUser,
    DocStatus,
    GenericData,
    HttpStatusCode,
    Localization,
    Logger,
    PortalUserTokenData,
    RowType,
    SessionType,
    UserTokenData,
} from '@diia-inhouse/types'
import { utils } from '@diia-inhouse/utils'

import TaxpayerCardService from '@src/documents/taxpayerCard/services/document'
import { ForeignPassport, InternalPassport, PassportRegistrationInfo, PassportType } from '@src/generated'

import AddressService from '@services/address'

import PassportDataMapper from '@dataMappers/passportDataMapper'

import Utils from '@utils/index'

import { FindForeignPassportsOps } from '@interfaces/dataMappers/passportDataMapper'
import { RegistryPassportDTO } from '@interfaces/dto'
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
import { DocumentInstance, AnalyticsActionResult as ServiceAnalyticsActionResult } from '@interfaces/services'
import {
    DocumentWithPhoto,
    GetDocumentsContext,
    GetDocumentsParams,
    GetDocumentsResult,
    IdentityDocument,
} from '@interfaces/services/documents'
import { AssertStrategyParams, DocumentVerifyParams, VerifyOtpResponse } from '@interfaces/services/documentVerification'
import { EnrichDocumentPhotoParams, PassportDocumentType, RegistrationSource } from '@interfaces/services/passport'
import { ServiceTask } from '@interfaces/tasks'
import { EventPayload } from '@interfaces/tasks/publishAdultRegistrationAddressCommunity'

export default class PassportService {
    private readonly documentTypeToPassportType: Record<string, PassportType> = {
        [PassportDocumentType.ForeignPassport]: PassportType.P,
        [PassportDocumentType.InternalPassport]: PassportType.ID,
    }

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

    async assertDocumentIsValid({ documentId, documentType, documentAssertParams }: AssertStrategyParams): Promise<void> | never {
        const { user } = documentAssertParams
        const expectedType = this.documentTypeToPassportType[documentType]

        const documents = await this.getPassportsEntity(user)

        if (documents.length === 0 || !expectedType) {
            throw new AccessDeniedError('Passport documents not found or received unexpected type')
        }

        const isEligibleForSharing = documents.some(({ id, type }) => id === documentId && type === expectedType)
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

    async getInternalPassportToProcess(user: UserTokenData): Promise<InternalPassportInstance | undefined> {
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
        const idCard = this.passportDataMapper.findIdCard(passports)
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
        params: EnrichDocumentPhotoParams = {},
    ): T {
        const { internalPassportFirst, analytics } = params

        this.logger.info('Start extracting photo from passports', { docId: document.id })

        const photo = this.extractPhotoFromPassports(passports, internalPassportFirst)

        if (analytics) {
            const { category, action, data } = analytics
            const actionResult = photo ? ServiceAnalyticsActionResult.Success : ServiceAnalyticsActionResult.Error

            this.analytics.log(category, action, actionResult, data)
        }

        if (photo) {
            document.photo = photo
            document.docStatus = DocStatus.Ok
        } else {
            this.logger.error('Could not find photo from passports', { docId: document.id })
        }

        return document
    }

    extractPhotoFromPassports(passports: Passport[], internalPassportFirst = false): string | undefined {
        if (passports.length === 0) {
            return
        }

        const internalPassport = this.passportDataMapper.findIdCard(passports)
        if (internalPassport && internalPassportFirst) {
            return internalPassport.photo
        }

        const foreignPassport = this.passportDataMapper
            .findForeignPassports(passports, { sortByDate: true })
            .find((passport) => passport.photo)

        return foreignPassport?.photo || internalPassport?.photo
    }

    async verifyInternalPassport(
        verifyOTPResponse: VerifyOtpResponse,
        params: DocumentVerifyParams = {},
    ): Promise<Passport | DocumentInstance> {
        const { designSystem, representative } = params

        const internalPassport = await this.verifyPassport(verifyOTPResponse, PassportType.ID, representative)

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
        const { designSystem, representative } = params

        const foreignPassport = await this.verifyPassport(verifyOTPResponse, PassportType.P, representative)

        if (designSystem) {
            if (!verifyOTPResponse.localization) {
                throw new BadRequestError('Localization is not provided for design system')
            }

            return this.passportDataMapper.toVerifyDocumentInstance(foreignPassport, verifyOTPResponse.localization)
        }

        return foreignPassport
    }

    getForeignPassportSharingRenderData(
        document: unknown,
        requester: string,
        requestDateTime: string,
        requestIdentifier: string,
    ): GenericData {
        const { lastNameEN, firstNameEN, lastNameUA, firstNameUA, middleNameUA, docNumber, photo, sign, eng, ua } = <ForeignPassport>(
            document
        )

        return {
            documentTitle: 'International Passport',
            blocks: [
                {
                    logoBlock: {
                        header: 'International Passport',
                        title: 'Закордонний паспорт',
                        subtitle: 'Ukraine • Україна',
                    },
                    marginBottom: 24,
                },
                { hasSeparator: true, marginBottom: 24 },
                {
                    identityBlock: {
                        lastName: lastNameEN,
                        firstName: firstNameEN,
                        fullName: utils.getFullName(lastNameUA, firstNameUA, middleNameUA),
                        documentNumber: docNumber,
                        photo,
                    },
                    marginBottom: 16,
                },
                { hasSeparator: true, marginBottom: 16 },
                {
                    textBlock: [
                        `The digital document copy requested on ${requestDateTime}`,
                        `Request initiator: ${requester}`,
                        `Request ID: ${requestIdentifier}`,
                    ],
                },
                {
                    tableBlock: [
                        [
                            RowType.TwoColumns,
                            { primaryText: eng?.gender?.name, secondaryText: ua?.gender?.name },
                            { primaryText: eng?.gender?.value, secondaryText: ua?.gender?.value },
                        ],
                        [
                            RowType.TwoColumns,
                            { primaryText: eng?.birthDate?.name, secondaryText: ua?.birthDate?.name },
                            { primaryText: eng?.birthDate?.value },
                        ],
                        [
                            RowType.TwoColumns,
                            { primaryText: eng?.nationality?.name, secondaryText: ua?.nationality?.name },
                            { primaryText: eng?.nationality?.value, secondaryText: ua?.nationality?.value },
                        ],
                        [
                            RowType.TwoColumns,
                            { primaryText: eng?.department?.name, secondaryText: ua?.department?.name },
                            { primaryText: eng?.department?.value },
                        ],
                        [
                            RowType.TwoColumns,
                            { primaryText: eng?.issueDate?.name, secondaryText: ua?.issueDate?.name },
                            { primaryText: eng?.issueDate?.value },
                        ],
                        [
                            RowType.TwoColumns,
                            { primaryText: eng?.expiryDate?.name, secondaryText: ua?.expiryDate?.name },
                            { primaryText: eng?.expiryDate?.value },
                        ],
                        [
                            RowType.TwoColumns,
                            { primaryText: eng?.identifier?.name, secondaryText: ua?.identifier?.name },
                            { primaryText: eng?.identifier?.value },
                        ],
                        [
                            RowType.TwoColumns,
                            { primaryText: eng?.type?.name, secondaryText: ua?.type?.name },
                            { primaryText: eng?.type?.value },
                        ],
                        [
                            RowType.TwoColumns,
                            { primaryText: eng?.countryCode?.name, secondaryText: ua?.countryCode?.name },
                            { primaryText: eng?.countryCode?.value },
                        ],
                        [
                            RowType.TwoColumns,
                            { primaryText: eng?.taxpayer?.name, secondaryText: ua?.taxpayer?.name },
                            {
                                primaryText: [eng?.taxpayer?.value || '', eng?.taxpayer?.statusDescription || ''],
                                secondaryText: ua?.taxpayer?.statusDescription,
                            },
                        ],
                        [
                            RowType.TwoColumns,
                            { primaryText: eng?.birthPlace?.name, secondaryText: ua?.birthPlace?.name },
                            { primaryText: `${eng?.birthPlace?.value || ''} • ${ua?.birthPlace?.value || ''}` },
                        ],
                        [
                            RowType.TwoColumns,
                            { primaryText: eng?.residenceRegistrationPlace?.name, secondaryText: ua?.residenceRegistrationPlace?.name },
                            { primaryText: eng?.residenceRegistrationPlace?.value },
                        ],
                        [RowType.TwoColumnsWithSign, { primaryText: 'Підпис:' }, { primaryText: sign }],
                    ],
                },
            ],
        }
    }

    getInternalPassportSharingRenderData(
        document: unknown,
        requester: string,
        requestDateTime: string,
        requestIdentifier: string,
    ): GenericData {
        const {
            lastNameEN,
            firstNameEN,
            lastNameUA,
            firstNameUA,
            middleNameUA,
            docNumber,
            photo,
            genderUA,
            birthday,
            nationalityUA,
            department,
            issueDate,
            expirationDate,
            taxpayerCard,
            recordNumber,
            birthPlaceUA,
            currentRegistrationPlaceUA,
            documentRegistrationPlaceUA,
            sign,
        } = <InternalPassport>document

        return {
            documentTitle: 'Internal Passport',
            blocks: [
                { logoBlock: { logoHeader: ['Паспорт громадянина', 'України'], trident: true }, marginBottom: 24 },
                { hasSeparator: true, marginBottom: 24 },
                {
                    identityBlock: {
                        lastName: lastNameUA,
                        firstName: firstNameUA,
                        middleName: middleNameUA,
                        fullName: utils.getFullName(lastNameEN, firstNameEN),
                        documentNumber: docNumber,
                        photo,
                    },
                    marginBottom: 16,
                },
                { hasSeparator: true, marginBottom: 16 },
                {
                    textBlock: [
                        `Запит на цифрові копії документів від ${requestDateTime}`,
                        `Ініціатор запиту: ${requester}`,
                        `Ідентифікатор запиту: ${requestIdentifier}`,
                    ],
                    marginBottom: 32,
                },
                {
                    tableBlock: [
                        [RowType.TwoColumns, { primaryText: 'Стать:' }, { primaryText: genderUA }],
                        [RowType.TwoColumns, { primaryText: 'Дата народження:' }, { primaryText: birthday }],
                        [RowType.TwoColumns, { primaryText: 'Громадянство:' }, { primaryText: nationalityUA }],
                        [RowType.TwoColumns, { primaryText: 'Орган, що видав:' }, { primaryText: department }],
                        [RowType.TwoColumns, { primaryText: 'Дата видачі:' }, { primaryText: issueDate }],
                        [RowType.TwoColumns, { primaryText: 'Дійсний до:' }, { primaryText: expirationDate }],
                        [
                            RowType.TwoColumns,
                            { primaryText: 'РНОКПП:' },
                            {
                                primaryText: [
                                    taxpayerCard?.number || '',
                                    `(Верифіковано у реєстрі Державної податкової служби за запитом від ${
                                        taxpayerCard?.creationDate || ''
                                    })`,
                                ],
                            },
                        ],
                        [RowType.TwoColumns, { primaryText: 'Запис № (УНЗР):' }, { primaryText: recordNumber }],
                        [RowType.TwoColumns, { primaryText: 'Місце народження:' }, { primaryText: birthPlaceUA }],
                        [
                            RowType.TwoColumns,
                            { primaryText: 'Місце реєстрації проживання:' },
                            { primaryText: currentRegistrationPlaceUA || documentRegistrationPlaceUA },
                        ],
                        [RowType.TwoColumnsWithSign, { primaryText: 'Підпис:' }, { primaryText: sign }],
                    ],
                },
            ],
        }
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
                    this.task.publish(ServiceTask.PublishAdultRegistrationAddressCommunity, <EventPayload>{
                        userIdentifier,
                        itn,
                        lName,
                        fName,
                        mName,
                        birthDay,
                        gender,
                    })

                    // eslint-disable-next-line unicorn/no-useless-undefined
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
        if (documents.length === 0) {
            throw new DocumentNotFoundError()
        }

        return documents
    }

    private async getInternalPassportFromPromise(promisedPassports: Promise<Passport[]>): Promise<InternalPassportInstance[]> {
        const passports: Passport[] = await promisedPassports

        const internalPassport = this.passportDataMapper.findIdCard(passports)
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
                const idCard = this.passportDataMapper.findIdCard(passports)
                // SPIKE: because of registry change date_issue (add delimiter '-')
                const idCardDocumentId = idCard?.id.replace('-', '')
                const requestDocumentId = docId.replace('-', '')

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
