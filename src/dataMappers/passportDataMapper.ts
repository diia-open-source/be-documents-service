import isBase64 from 'is-base64'
import moment from 'moment'

import { DocumentNotFoundError } from '@diia-inhouse/errors'
import {
    ActionCode,
    DocStatus,
    DocumentFullInfoItem,
    DocumentInstance,
    DocumentType,
    DocumentTypeCamelCase,
    FrontCardItem,
    HeadingWithSubtitlesMlc,
    IconAtmActionType,
    Localization,
    TableBlockOrg,
    TableItemMlc,
} from '@diia-inhouse/types'
import { utils } from '@diia-inhouse/utils'

import { PassportRegistration, PassportRegistrationInfo } from '@src/generated'

import DocumentAttributesService from '@services/documentAttributes'

import DesignSystemDataMapper from '@dataMappers/designSystemDataMapper'
import RegistrationAddressDataMapper from '@dataMappers/registrationAddressDataMapper'

import Utils from '@utils/index'

import { AppConfig } from '@interfaces/config'
import { FindForeignPassportsOps } from '@interfaces/dataMappers/passportDataMapper'
import {
    CountryCode,
    PassportGenderEN,
    PassportGenderUA,
    PassportType,
    RegistryPassportDTO,
    RegistryPassportInstance,
    RegistryPassportRegistration,
} from '@interfaces/dto'
import {
    BasePassportInstance,
    ForeignPassportFrontCardInfo,
    ForeignPassportInstance,
    ForeignPassportInstanceDetails,
    InternalPassportInstance,
    NationalityEN,
    NationalityUA,
    Passport,
    PassportFull,
} from '@interfaces/providers/eis'
import { RegistrationAddress } from '@interfaces/providers/usdr'
import { DocumentTickerCode } from '@interfaces/services/documentAttributes'
import { DefaultValue, DocumentMediaAlias } from '@interfaces/services/documents'

// TODO(BACK-2386): migrate to strategies approach
export default class PassportDataMapper {
    readonly mapPassportTypeToIdentityDocumentType: Record<PassportType, DocumentType> = {
        [PassportType.ID]: DocumentType.InternalPassport,
        [PassportType.P]: DocumentType.ForeignPassport,
    }

    readonly passportTypeToDocumentType: Record<PassportType, DocumentType> = {
        [PassportType.ID]: DocumentType.InternalPassport,
        [PassportType.P]: DocumentType.ForeignPassport,
    }

    private readonly defaultValueByLocalization: Record<Localization, DefaultValue> = {
        [Localization.UA]: DefaultValue.NotProvided,
        [Localization.ENG]: DefaultValue.NotProvidedEN,
    }

    private readonly docNameByTypeMap: Record<PassportType, Record<Localization, string>> = {
        [PassportType.ID]: {
            [Localization.UA]: 'Паспорт громадянина України',
            [Localization.ENG]: 'Паспорт громадянина України',
        },
        [PassportType.P]: {
            [Localization.UA]: 'Закордонний паспорт',
            [Localization.ENG]: 'International Passport',
        },
    }

    private readonly docNameByTypeMapWithSeparator: Record<PassportType, Record<Localization, string>> = {
        [PassportType.ID]: {
            [Localization.UA]: 'Паспорт громадянина\nУкраїни',
            [Localization.ENG]: 'Паспорт громадянина\nУкраїни',
        },
        [PassportType.P]: {
            [Localization.UA]: 'Закордонний\nпаспорт',
            [Localization.ENG]: 'International\nPassport',
        },
    }

    private readonly frontCardBirthLabelMap: Record<Localization, string> = {
        [Localization.UA]: 'Дата\nнародження:',
        [Localization.ENG]: 'Date of birth:',
    }

    private readonly frontCardDocNumberMap: Record<Localization, string> = {
        [Localization.UA]: 'Номер:',
        [Localization.ENG]: 'Document\nnumber:',
    }

    private readonly docHeadingMap: Record<PassportType, HeadingWithSubtitlesMlc> = {
        [PassportType.ID]: {
            value: 'Паспорт громадянина\nУкраїни',
            subtitles: [],
        },
        [PassportType.P]: {
            value: 'International Passport',
            subtitles: ['Закордонний паспорт', 'Ukraine • Україна'],
        },
    }

    constructor(
        private readonly appUtils: Utils,
        private readonly config: AppConfig,

        private readonly designSystemDataMapper: DesignSystemDataMapper,
        private readonly registrationAddressDataMapper: RegistrationAddressDataMapper,

        private readonly documentAttributesService: DocumentAttributesService,
    ) {}

    toDocumentInstanceV1(passport: RegistryPassportDTO): Passport[] {
        const passportEntities = this.mapPassports(passport)
        if (!passportEntities.length) {
            throw new DocumentNotFoundError()
        }

        return passportEntities
    }

    toDocumentInstance(type: PassportType, passport: RegistryPassportDTO, taxpayerCardTableOrg: TableBlockOrg): DocumentInstance[] {
        const { documents, date_birth: dateBirth, gender, unzr } = passport
        const filteredRawDocuments = documents.filter((document) => document.type === type)

        const registration = this.toRegistration(passport)

        const extendedPassports = filteredRawDocuments.map((document): DocumentInstance | undefined => {
            const { date_issue: dateIssueRaw, date_expiry: dateExpireRaw, photo, type: passportType } = document

            const docNumber = document.number?.toUpperCase()

            const namePartsUa = [document.last_name, document.first_name, document.middle_name]
            const [lastNameUa, firstNameUa, middleNameUa] = namePartsUa.map((name) => utils.capitalizeName(name))

            const namePartsEn = [document.last_name_en, document.first_name_en, document.middle_name_en]
            const [lastNameEn, firstNameEn, middleNameEn] = namePartsEn.map((name) => utils.capitalizeName(name))

            if (!this.isValidDocument(dateIssueRaw, dateExpireRaw, docNumber, lastNameUa, firstNameUa, photo)) {
                return
            }

            const tickerUa = this.documentAttributesService.getDefaultTicker(Localization.UA)
            const tickerEn = this.documentAttributesService.getDefaultTicker(Localization.ENG)
            const tickerEnUa = this.documentAttributesService.getTicker({
                code: DocumentTickerCode.UpdatedAtEnUa,
                localization: Localization.ENG,
                templateParams: {
                    [DocumentTickerCode.UpdatedAt]: this.documentAttributesService.getUpdatedAtValue(),
                },
            })

            const fullName = utils.getFullName(lastNameUa, firstNameUa, middleNameUa)
            const fullNameWithSeparator = utils.getFullName(lastNameUa, firstNameUa, middleNameUa, '\n')
            const fullNameWithSeparatedMiddleName = this.appUtils.getFullNameWithSeparatedMiddleName(
                lastNameUa,
                firstNameUa,
                middleNameUa,
                '\n',
            )
            const fullNameEn = utils.getFullName(lastNameEn, firstNameEn, middleNameEn)
            const fullNameEnWithSeparator = utils.getFullName(lastNameEn, firstNameEn, middleNameEn, '\n')

            const genderUa = this.genderEnToUa(gender)
            const genderEn = gender || ''

            const [birthDate, issueDate, expirationDate] = [dateBirth, dateIssueRaw, dateExpireRaw].map((date) =>
                this.appUtils.convertDate(date),
            )

            const [birthPlaceUa] = this.parseBirthPlace(document.birth_place)

            const frontCardInfoUa: ForeignPassportFrontCardInfo = {
                docNumber,
                ticker: tickerUa,
                fullName: fullNameWithSeparator,
                birthDate: birthDate || DefaultValue.NotProvided,
            }

            const frontCardInfoEn: ForeignPassportFrontCardInfo = {
                docNumber,
                ticker: tickerEn,
                fullName: fullNameEnWithSeparator,
                birthDate: birthDate || DefaultValue.NotProvidedEN,
            }

            const isForeignPassportType = [PassportType.P].includes(passportType)

            return {
                id: this.prepareId(unzr, dateIssueRaw),
                docStatus: DocStatus.Ok,
                docNumber,
                content: [
                    {
                        image: photo,
                        code: DocumentMediaAlias.Photo,
                    },
                    {
                        image: document.signature,
                        code: DocumentMediaAlias.Signature,
                    },
                ],
                docData: {
                    docName: this.docNameByTypeMap[passportType][Localization.UA],
                    birthday: birthDate || DefaultValue.NotProvided,
                    fullName,
                    fullNameHash: this.appUtils.createFullNameHash(lastNameUa, firstNameUa, document.middle_name),
                    expirationDate,
                    dataIssued: issueDate,
                },
                dataForDisplayingInOrderConfigurations: {
                    iconRight: {
                        code: ActionCode.drag,
                    },
                    label: docNumber,
                    description: `Дата видачі: ${issueDate || DefaultValue.NotProvided}`,
                },
                frontCard: {
                    UA: this.getFrontCardItems(frontCardInfoUa, passportType, Localization.UA),
                    EN: isForeignPassportType ? this.getFrontCardItems(frontCardInfoEn, passportType, Localization.ENG) : [],
                },
                fullInfo: [
                    {
                        docHeadingOrg: {
                            headingWithSubtitlesMlc: this.docHeadingMap[passportType],
                            docNumberCopyMlc: {
                                value: docNumber,
                                icon: {
                                    code: ActionCode.copy,
                                    action: {
                                        type: IconAtmActionType.copy,
                                    },
                                },
                            },
                        },
                    },
                    { tickerAtm: isForeignPassportType ? tickerEnUa : tickerUa },
                    {
                        tableBlockTwoColumnsOrg: {
                            headingWithSubtitlesMlc: {
                                value: fullNameWithSeparatedMiddleName,
                                subtitles: [fullNameEn],
                            },
                            photo: DocumentMediaAlias.Photo,
                            items: [
                                {
                                    tableItemVerticalMlc: {
                                        label: 'Дата\nнародження:',
                                        secondaryLabel: 'Date of birth',
                                        value: birthDate || DefaultValue.NotProvided,
                                        valueIcons: [],
                                        valueImages: [],
                                    },
                                },
                                {
                                    tableItemVerticalMlc: {
                                        valueImage: DocumentMediaAlias.Signature,
                                        valueIcons: [],
                                        valueImages: [],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        tableBlockOrg: {
                            items: [
                                {
                                    tableItemHorizontalMlc: {
                                        label: 'Стать:',
                                        secondaryLabel: 'Sex',
                                        value: genderUa,
                                        secondaryValue: genderEn,
                                    },
                                },
                                {
                                    tableItemHorizontalMlc: {
                                        label: 'Громадянство:',
                                        secondaryLabel: 'Nationality',
                                        value: NationalityUA.Ukraine,
                                        secondaryValue: NationalityEN.Ukraine,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        tableBlockOrg: {
                            items: [
                                {
                                    tableItemHorizontalMlc: {
                                        label: 'Дата видачі:',
                                        secondaryLabel: 'Date of issue',
                                        value: issueDate || DefaultValue.NotProvided,
                                    },
                                },
                                {
                                    tableItemHorizontalMlc: {
                                        label: 'Дійсний до:',
                                        secondaryLabel: 'Date of expiry',
                                        value: expirationDate || DefaultValue.NotProvided,
                                    },
                                },
                                {
                                    tableItemHorizontalMlc: {
                                        label: 'Орган, що видав:',
                                        secondaryLabel: 'Authority',
                                        value: document.dep_issue || DefaultValue.NotProvided,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        tableBlockOrg: taxpayerCardTableOrg,
                    },
                    ...this.getUnzrBlock(unzr, passportType, birthPlaceUa, registration),
                    ...this.getLocationBlock(passportType, registration),
                ],
            }
        })

        return extendedPassports.filter((item): item is DocumentInstance => Boolean(item))
    }

    toVerifyDocumentInstance(passport: Passport, localization: Localization): DocumentInstance {
        const { docStatus, id, docNumber, photo, firstNameUA, lastNameUA, middleNameUA, firstNameEN, lastNameEN, type, birthday } = passport

        const fullName = utils.getFullName(lastNameUA, firstNameUA, middleNameUA)
        const fullNameWithSeparator = utils.getFullName(lastNameUA, firstNameUA, middleNameUA, '\n')
        const fullNameEnWithSeparator = utils.getFullName(lastNameEN, firstNameEN, '', '\n')

        const docName = this.docNameByTypeMap[type][localization]
        const isForeignPassportType = [PassportType.P].includes(type)

        const frontCardInfoUa: ForeignPassportFrontCardInfo = {
            docNumber,
            ticker: this.documentAttributesService.getTicker({
                code: DocumentTickerCode.Valid,
                localization: Localization.UA,
            }),
            fullName: fullNameWithSeparator,
            birthDate: birthday,
        }

        const frontCardInfoEn: ForeignPassportFrontCardInfo = {
            docNumber,
            ticker: this.documentAttributesService.getTicker({
                code: DocumentTickerCode.Valid,
                localization: Localization.ENG,
            }),
            fullName: fullNameEnWithSeparator,
            birthDate: birthday,
        }

        return {
            docStatus,
            shareLocalization: localization,
            id,
            docNumber,
            content: [
                {
                    image: photo,
                    code: DocumentMediaAlias.Photo,
                },
            ],
            docData: {
                docName,
                fullName,
                birthday,
            },
            frontCard: {
                UA: localization === Localization.UA ? this.getFrontCardVerifyItems(frontCardInfoUa, type, Localization.UA) : [],
                EN:
                    localization === Localization.ENG && isForeignPassportType
                        ? this.getFrontCardVerifyItems(frontCardInfoEn, type, Localization.ENG)
                        : [],
            },
            fullInfo: [],
        }
    }

    mapPassports(document: RegistryPassportDTO, passportTypeFilter?: PassportType): Passport[] {
        const passportEntities: Passport[] = []
        const { documents, date_birth: dateBirth, gender, unzr } = document
        const parsedRegistration = this.getRegistrationAddress(document)
        let currentRegistration = parsedRegistration && `${parsedRegistration.registrationAddress}`

        if (currentRegistration && parsedRegistration && parsedRegistration.registrationDate) {
            currentRegistration += `.\nДата реєстрації: ${parsedRegistration.registrationDate}`
        }

        documents.forEach((item: RegistryPassportInstance) => {
            let passportEntity: Passport
            const [birthPlaceUA, birthPlaceEN]: [string, string] = this.parseBirthPlace(item.birth_place)
            const docNumber: string = item.number?.toUpperCase()
            const lastNameUA: string = utils.capitalizeName(item.last_name)
            const firstNameUA: string = utils.capitalizeName(item.first_name)

            if (!this.isValidDocument(item.date_issue, item.date_expiry, docNumber, lastNameUA, firstNameUA, item.photo)) {
                return
            }

            const basePassportInstance: BasePassportInstance = {
                docStatus: DocStatus.Ok,
                docNumber,
                ...this.getSeriesNumber(docNumber, item.type),
                id: this.prepareId(unzr, item.date_issue),
                lastNameUA,
                firstNameUA,
                middleNameUA: utils.capitalizeName(item.middle_name),
                lastNameEN: utils.capitalizeName(item.last_name_en),
                firstNameEN: utils.capitalizeName(item.first_name_en),
                fullNameHash: this.appUtils.createFullNameHash(lastNameUA, firstNameUA, item.middle_name),
                genderUA: this.genderEnToUa(gender),
                genderEN: gender || '',
                nationalityUA: NationalityUA.Ukraine,
                nationalityEN: NationalityEN.Ukraine,
                photo: item.photo,
                birthday: this.appUtils.convertDate(dateBirth) || DefaultValue.NotProvided,
                sign: item.signature || '',
                birthPlaceUA: birthPlaceUA || DefaultValue.NotProvided,
                birthPlaceEN: birthPlaceEN || '',
                issueDate: this.appUtils.convertDate(item.date_issue)!,
                expirationDate: this.appUtils.convertDate(item.date_expiry)!,
                recordNumber: unzr || DefaultValue.NotProvided,
                type: item.type,
                documentRegistrationPlaceUA: currentRegistration || DefaultValue.NotProvided,
                currentRegistrationPlaceUA: currentRegistration || DefaultValue.NotProvided,
            }

            const department: string = item.dep_issue || DefaultValue.NotProvided

            if (item.type === PassportType.ID) {
                passportEntity = {
                    ...basePassportInstance,
                    department,
                }
            } else if (item.type === PassportType.P) {
                const passportType: PassportType = PassportType.P

                passportEntity = {
                    ...basePassportInstance,
                    departmentUA: department,
                    departmentEN: department,
                    typeUA: passportType,
                    typeEN: passportType,
                    countryCode: CountryCode.Ukr,
                    tickerOptions: this.documentAttributesService.getTickerV1(
                        DocumentType.ForeignPassport,
                        DocumentTickerCode.ValidOnlyInUkraine,
                    ),
                }

                passportEntity.ua = this.toForeignPassportLocaleDetails(document, passportEntity, parsedRegistration, Localization.UA)
                passportEntity.eng = this.toForeignPassportLocaleDetails(document, passportEntity, parsedRegistration, Localization.ENG)
            } else {
                return
            }

            passportEntities.push(passportEntity)
        })

        if (passportTypeFilter) {
            return passportEntities.filter((passport: Passport) => passport.type === passportTypeFilter)
        }

        return passportEntities
    }

    findIdCard(passports: Passport[]): InternalPassportInstance {
        return <InternalPassportInstance>passports.find((doc: Passport) => doc.type === PassportType.ID)
    }

    findForeignPassports(passports: Passport[], { sortByDate = false }: FindForeignPassportsOps = {}): ForeignPassportInstance[] {
        const foreignPassports: ForeignPassportInstance[] = <ForeignPassportInstance[]>(
            passports.filter((doc: Passport) => doc.type === PassportType.P)
        )

        if (!sortByDate) {
            return foreignPassports
        }

        const dateFormat: string = this.config.app.dateFormat

        return foreignPassports.sort((a: ForeignPassportInstance, b: ForeignPassportInstance) => {
            const aDate: moment.Moment = moment(a.issueDate, dateFormat)
            const bDate: moment.Moment = moment(b.issueDate, dateFormat)

            if (aDate < bDate) {
                return 1
            }

            if (aDate > bDate) {
                return -1
            }

            return 0
        })
    }

    toFullEntity(document: RegistryPassportDTO): PassportFull {
        const { documents, date_birth: birthDate, gender, unzr, rnokpp } = document

        const passport: PassportFull = {
            data: documents
                .filter((item: RegistryPassportInstance) => !!item.photo && isBase64(item.photo))
                .map((item: RegistryPassportInstance) => ({
                    rnokpp,
                    type: item.type,
                    firstNameUA: item.first_name,
                    middleNameUA: item.middle_name,
                    lastNameUA: item.last_name,
                    firstNameEN: item.first_name_en,
                    lastNameEN: item.last_name_en,
                    middleNameEN: item.middle_name_en,
                    birthDate,
                    number: item.number,
                    personImage: item.photo,
                    signatureImage: item.signature,
                    genderUA: this.genderEnToUa(gender),
                    genderEN: gender,
                    nationalityUA: NationalityUA.Ukraine,
                    nationalityEN: NationalityEN.Ukraine,
                    issueData: item.date_issue,
                    expirationData: item.date_expiry,
                    authority: item.dep_issue,
                    countryCode: 'UKR',
                    birthPlace: item.birth_place,
                    recordNumber: unzr,
                })),
        }

        return passport
    }

    getRegistrationAddress(document: RegistryPassportDTO): RegistrationAddress | undefined {
        const { registration } = document

        const address = typeof registration === 'string' ? registration : this.toRegistration(document)

        return this.registrationAddressDataMapper.toEntity(address!)
    }

    toRegistration(document: RegistryPassportDTO): PassportRegistrationInfo | undefined {
        const { registration } = document

        if (typeof registration === 'string') {
            return
        }

        const address = this.toPassportRegistration(registration)

        return this.registrationAddressDataMapper.toRegistrationInfo(address, this.config.app.dateFormat)
    }

    extractUnzr(id: string): string {
        return id.substring(0, 14)
    }

    private toPassportRegistration(registration: RegistryPassportRegistration): PassportRegistration {
        const {
            cbc_country: country,
            postbox,
            region,
            address_koatuu: addressKoatuu,
            address_katotth: addressKatottg,
            address_grom_katottg: addressGromKatottg,
            region_district: regionDistrict,
            city_district: cityDistrict,
            settlement_district_katottg: cityDistrictKatottg,
            settlement_name: settlementName,
            settlement_type: settlementType,
            street_name: streetName,
            street_type: streetType,
            building_number: buildingNumber,
            building_part: buildingPart,
            apartment,
            registration_date: registrationDate,
            cancelregistration_date: cancelregistrationDate,
        } = registration

        return {
            country,
            postbox,
            addressKoatuu,
            addressKatottg,
            addressGromKatottg,
            region,
            regionName: this.removeAddressType(region, ['M.', 'ОБЛАСТЬ']),
            regionDistrict,
            regionDistrictName: this.removeAddressType(regionDistrict, ['РАЙОН']),
            cityDistrict,
            cityDistrictName: this.removeAddressType(cityDistrict, ['РАЙОН']),
            cityDistrictKatottg,
            settlementName,
            settlementType,
            streetName,
            streetType,
            buildingNumber,
            buildingPart,
            apartment,
            registrationDate: registrationDate || undefined,
            cancelregistrationDate: cancelregistrationDate || undefined,
        }
    }

    private removeAddressType(name: string | undefined, searchStrings: string[] = []): string | undefined {
        if (name === undefined) {
            return
        }

        return searchStrings.reduce((result, searchString) => result.replace(searchString, ''), name).trim()
    }

    private toForeignPassportLocaleDetails(
        document: RegistryPassportDTO,
        passport: ForeignPassportInstance,
        address: RegistrationAddress | undefined,
        localization: Localization,
    ): ForeignPassportInstanceDetails {
        const { date_birth: dateBirth, unzr } = document
        const {
            docNumber,
            lastNameUA,
            firstNameUA,
            middleNameUA,
            lastNameEN,
            firstNameEN,
            genderUA,
            genderEN,
            nationalityUA,
            nationalityEN,
            departmentUA,
            departmentEN,
            issueDate,
            expirationDate,
            typeUA,
            typeEN,
            countryCode,
            birthPlaceUA,
            birthPlaceEN,
        } = passport
        const defaultValue = this.defaultValueByLocalization[localization]

        const icon = this.documentAttributesService.getTrident(DocumentType.ForeignPassport)
        const birthday = this.appUtils.convertDate(dateBirth) || defaultValue
        const recordNumber = unzr || defaultValue
        const residenceRegistrationPlace = address?.registrationAddress || defaultValue
        const registrationDate = address?.registrationDate || defaultValue

        switch (localization) {
            case Localization.UA: {
                return {
                    card: {
                        name: 'Закордонний\nпаспорт',
                        icon,
                        lastName: lastNameUA,
                        firstName: firstNameUA,
                        middleName: middleNameUA,
                        birthDate: { name: 'Дата\nнародження', value: birthday },
                        docNumber: { name: 'Номер', value: docNumber },
                    },
                    name: 'Закордонний паспорт',
                    icon,
                    country: 'Україна',
                    docNumber: { name: 'Номер', value: docNumber },
                    lastName: lastNameUA,
                    firstName: `${firstNameUA} ${middleNameUA}`,
                    gender: { name: 'Стать', value: genderUA },
                    birthDate: { name: 'Дата народження', value: birthday },
                    nationality: { name: 'Громадянство', value: nationalityUA },
                    department: { name: 'Орган, що видав', value: departmentUA },
                    issueDate: { name: 'Дата видачі', value: issueDate },
                    expiryDate: { name: 'Дійсний до', value: expirationDate },
                    identifier: { name: 'Запис № (УНЗР)', value: recordNumber },
                    type: { name: 'Тип', value: typeUA },
                    countryCode: { name: 'Код держави', value: countryCode },
                    birthPlace: { name: 'Місце народження', value: birthPlaceUA },
                    residenceRegistrationPlace: { name: 'Місце реєстрації проживання', value: residenceRegistrationPlace },
                    registrationDate: { name: 'Дата реєстрації', value: registrationDate },
                }
            }
            case Localization.ENG: {
                return {
                    card: {
                        name: 'International\nPassport',
                        icon,
                        lastName: lastNameEN,
                        firstName: firstNameEN,
                        birthDate: { name: 'Date of birth', value: birthday },
                        docNumber: { name: 'Document\nnumber', value: docNumber },
                    },
                    name: 'International Passport',
                    icon,
                    country: 'Ukraine',
                    docNumber: { name: 'Document number', value: docNumber },
                    lastName: lastNameEN,
                    firstName: firstNameEN,
                    gender: { name: 'Sex:', value: genderEN },
                    birthDate: { name: 'Date of birth:', value: birthday },
                    nationality: { name: 'Nationality:', value: nationalityEN },
                    department: { name: 'Authority:', value: departmentEN },
                    issueDate: { name: 'Date of issue:', value: issueDate },
                    expiryDate: { name: 'Date of expiry:', value: expirationDate },
                    identifier: { name: 'Record No.:', value: recordNumber },
                    type: { name: 'Type:', value: typeEN },
                    countryCode: { name: 'Country code:', value: countryCode },
                    birthPlace: { name: 'Place of birth:', value: birthPlaceEN },
                    residenceRegistrationPlace: { name: 'Legal address:', value: residenceRegistrationPlace },
                    registrationDate: { name: 'Registered on:', value: registrationDate },
                }
            }
        }
    }

    private genderEnToUa(gender: PassportGenderEN): PassportGenderUA | string {
        if (gender === PassportGenderEN.F) {
            return PassportGenderUA.F
        }

        if (gender === PassportGenderEN.M) {
            return PassportGenderUA.M
        }

        return DefaultValue.NotProvided
    }

    private parseBirthPlace(birthPlace: string): [string, string] {
        const [birthPlaceUA, ...birthPlaceENParts]: string[] = birthPlace.split('/')

        return [birthPlaceUA, birthPlaceENParts.join('/')]
    }

    private prepareId(unzr: string, dateIssue: string): string {
        return `${unzr}-${dateIssue}`
    }

    private getSeriesNumber(docNumber: string, type: PassportType): Pick<BasePassportInstance, 'number' | 'series'> {
        switch (type) {
            case PassportType.ID: {
                return { number: docNumber }
            }
            case PassportType.P: {
                const seriesLength = 2
                const [series, number] = [docNumber.slice(0, seriesLength), docNumber.slice(seriesLength)]

                return { series, number }
            }
        }
    }

    private getFrontCardItems(data: ForeignPassportFrontCardInfo, passportType: PassportType, locale: Localization): FrontCardItem[] {
        const { docNumber, ticker, fullName, birthDate } = data
        const docName = this.docNameByTypeMapWithSeparator[passportType][locale]

        const passportToDocTypeMap: Record<PassportType, DocumentTypeCamelCase> = {
            [PassportType.ID]: DocumentTypeCamelCase.idCard,
            [PassportType.P]: DocumentTypeCamelCase.foreignPassport,
        }

        return this.designSystemDataMapper.getFrontCardWithPhotoDefault(
            docName,
            passportToDocTypeMap[passportType],
            fullName,
            ticker,
            [
                {
                    tableItemVerticalMlc: {
                        label: this.frontCardBirthLabelMap[locale],
                        value: birthDate,
                        valueIcons: [],
                        valueImages: [],
                    },
                },
                {
                    tableItemVerticalMlc: {
                        label: this.frontCardDocNumberMap[locale],
                        value: docNumber,
                        valueIcons: [],
                        valueImages: [],
                    },
                },
                {
                    tableItemVerticalMlc: {
                        valueImage: DocumentMediaAlias.Signature,
                        valueIcons: [],
                        valueImages: [],
                    },
                },
            ],
            locale,
        )
    }

    private getFrontCardVerifyItems(data: ForeignPassportFrontCardInfo, passportType: PassportType, locale: Localization): FrontCardItem[] {
        const { docNumber, ticker, fullName, birthDate } = data
        const docName = this.docNameByTypeMapWithSeparator[passportType][locale]

        const passportToDocTypeMap: Record<PassportType, DocumentTypeCamelCase> = {
            [PassportType.ID]: DocumentTypeCamelCase.idCard,
            [PassportType.P]: DocumentTypeCamelCase.foreignPassport,
        }

        return this.designSystemDataMapper.getFrontCardWithPhotoDefault(
            docName,
            passportToDocTypeMap[passportType],
            fullName,
            ticker,
            [
                {
                    tableItemVerticalMlc: {
                        label: this.frontCardBirthLabelMap[locale],
                        value: birthDate,
                        valueIcons: [],
                        valueImages: [],
                    },
                },
                {
                    tableItemVerticalMlc: {
                        label: this.frontCardDocNumberMap[locale],
                        value: docNumber,
                        valueIcons: [],
                        valueImages: [],
                    },
                },
            ],
            locale,
            true,
        )
    }

    private getLocationBlock(type: PassportType, registration: PassportRegistrationInfo | undefined): DocumentFullInfoItem[] {
        if (type === PassportType.ID) {
            return []
        }

        return [
            {
                tableBlockOrg: {
                    items: [this.getLegalAddressMlc(registration), this.getRegistrationDateMlc(registration)],
                },
            },
        ]
    }

    private getUnzrBlock(
        unzr: string,
        type: PassportType,
        birthPlace: string,
        registration: PassportRegistrationInfo | undefined,
    ): DocumentFullInfoItem[] {
        const unzrItem: TableItemMlc = {
            tableItemHorizontalMlc: this.designSystemDataMapper.getTableItemHorizontalWithCopyAction(
                unzr || DefaultValue.NotProvided,
                'Запис № (УНЗР):',
                'Record No.',
            ),
        }

        const birthPlaceItem: TableItemMlc = {
            tableItemHorizontalMlc: {
                label: 'Місце народження:',
                secondaryLabel: 'Place of birth',
                value: birthPlace || DefaultValue.NotProvided,
            },
        }

        if (type === PassportType.ID) {
            return [
                {
                    tableBlockOrg: {
                        items: [unzrItem, birthPlaceItem, this.getLegalAddressMlc(registration), this.getRegistrationDateMlc(registration)],
                    },
                },
            ]
        }

        return [
            {
                tableBlockOrg: {
                    items: [
                        unzrItem,
                        {
                            tableItemHorizontalMlc: {
                                label: 'Тип:',
                                secondaryLabel: 'Type',
                                value: type,
                            },
                        },
                        {
                            tableItemHorizontalMlc: {
                                label: 'Код держави:',
                                secondaryLabel: 'Country code',
                                value: CountryCode.Ukr,
                            },
                        },
                        birthPlaceItem,
                    ],
                },
            },
        ]
    }

    private getLegalAddressMlc(registration: PassportRegistrationInfo | undefined): TableItemMlc {
        return {
            tableItemVerticalMlc: {
                label: 'Місце проживання:',
                secondaryLabel: 'Legal address',
                value: registration?.fullName || DefaultValue.NotProvided,
                valueImages: [],
                valueIcons: [],
            },
        }
    }

    private getRegistrationDateMlc(registration: PassportRegistrationInfo | undefined): TableItemMlc {
        const { registrationDate } = registration || {}

        return {
            tableItemHorizontalMlc: {
                label: 'Дата реєстрації:',
                secondaryLabel: 'Registered on',
                value: registrationDate ? moment(registrationDate).format('DD.MM.YYYY') : DefaultValue.NotProvided,
            },
        }
    }

    private isValidDocument(
        dateIssue: string,
        dateExpire: string,
        docNumber: string,
        lastName: string,
        firstName: string,
        photo: string,
    ): boolean {
        const invalidConditions = [
            !this.appUtils.isValidDate(dateIssue),
            !this.appUtils.isValidDate(dateExpire),
            this.appUtils.isFutureDate(dateIssue),
            !this.config.eis.returnExpired && this.appUtils.isExpiredDate(dateExpire),
            !docNumber,
            !lastName,
            !firstName,
            !photo,
            !isBase64(photo),
        ]

        return invalidConditions.every((invalid) => !invalid)
    }
}
