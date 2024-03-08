import isBase64 from 'is-base64'
import { get } from 'lodash'
import moment from 'moment'

import {
    ActionCode,
    AddressType,
    DocStatus,
    DocumentInstance,
    DocumentStatus,
    DocumentType,
    DocumentTypeCamelCase,
    DriverLicense,
    DriverLicenseCategory,
    DriverLicenseDetails,
    IconAtmActionType,
    LicenseCategory,
    LicenseType,
    Localization,
    Logger,
    UserDocumentSubtype,
} from '@diia-inhouse/types'
import { utils } from '@diia-inhouse/utils'

import { PluginConfig } from '@src/documents/driverLicense/interfaces/config'
import {
    Category,
    DriverLicenseDocument,
    DriverLicenseDocumentDTO,
    DriverLicenseFull,
    RegistryDriverLicenseDTO,
} from '@src/documents/driverLicense/interfaces/providers/hsc'
import { ComponentDocumentName } from '@src/documents/driverLicense/interfaces/services'

import DocumentAttributesService from '@services/documentAttributes'

import DesignSystemDataMapper from '@dataMappers/designSystemDataMapper'

import Utils from '@utils/index'

import { AppConfig } from '@interfaces/config'
import { DocumentDataMapper } from '@interfaces/dataMappers'
import { Client, ClientAddress } from '@interfaces/dto'
import { DocumentTickerCode, DocumentTickerPlaceholder } from '@interfaces/services/documentAttributes'
import { ComponentIdFrontCard, ComponentIdFullInfo, DefaultValue, DocumentMediaAlias } from '@interfaces/services/documents'
import { UserProfileDocument } from '@interfaces/services/user'

export default class DriverLicenseDataMapper implements DocumentDataMapper {
    readonly documentTypes = [DocumentType.DriverLicense]

    private readonly defaultValueByLocalization: Record<Localization, DefaultValue> = {
        [Localization.UA]: DefaultValue.NotProvided,
        [Localization.ENG]: DefaultValue.NotProvidedEN,
    }

    private readonly docNameByLocaleMap: Record<Localization, string> = {
        [Localization.UA]: 'Посвідчення водія',
        [Localization.ENG]: 'Driving Licence',
    }

    private readonly licenseTypeToSubType: Record<LicenseType, UserDocumentSubtype> = {
        [LicenseType.permanent]: UserDocumentSubtype.Permanent,
        [LicenseType.issuedFirst]: UserDocumentSubtype.IssuedFirst,
    }

    constructor(
        private readonly appUtils: Utils,
        private readonly config: AppConfig & PluginConfig,
        private readonly logger: Logger,

        private readonly designSystemDataMapper: DesignSystemDataMapper,

        private readonly documentAttributesService: DocumentAttributesService,
    ) {}

    // TODO(BACK-3092) create and use common entity
    toDocumentInstanceV1(
        document: RegistryDriverLicenseDTO,
        unzr: string | undefined,
        defaultValue: DefaultValue | null = DefaultValue.NotProvided,
    ): DriverLicense[] {
        this.printStatInfo(document)

        const licenseEntities: DriverLicense[] = []
        const inactiveLicenseEntries: DriverLicense[] = []

        const { driverLicense, client, clientAddr } = document
        const { lastNameUA, firstNameUA, middleNameUA, lastNameEN, firstNameEN, birthday } = client
        const [birthAddress] = this.birthAddressesOnly(clientAddr)
        const driverLicenses: DriverLicenseDocumentDTO[] = this.availableLicensesOnly(driverLicense)

        driverLicenses.forEach((license: DriverLicenseDocumentDTO) => {
            const {
                id,
                dend,
                department: { VALUE: department, ID: departmentId },
                photo,
                clientId,
                sdoc,
                ndoc,
                ddoc,
            } = license
            const type: LicenseType = this.getLicenseType(license)
            const isLicensePhotoValid = Boolean(photo && isBase64(photo))
            const isExpiredIssuedFirst = type === LicenseType.issuedFirst && this.appUtils.isExpiredDate(dend)
            const docStatus = this.getDocStatus(license, client, isLicensePhotoValid, isExpiredIssuedFirst)
            const categories = this.licenseCategories(license.categories)
            const serialNumber = `${sdoc}${ndoc}`

            if (!this.config[DocumentType.DriverLicense].returnExpired && !isExpiredIssuedFirst && this.appUtils.isExpiredDate(dend)) {
                return
            }

            const licenseEntity: DriverLicense = {
                id: id.toString(),
                docStatus,
                docNumber: serialNumber,
                type,
                clientId: clientId.toString(),
                serial: sdoc,
                number: ndoc,
                issueDate: this.appUtils.convertDate(ddoc)!,
                lastNameUA: utils.capitalizeName(lastNameUA),
                firstNameUA: utils.capitalizeName(firstNameUA),
                middleNameUA: utils.capitalizeName(middleNameUA),
                fullNameHash: this.appUtils.createFullNameHash(lastNameUA, firstNameUA, middleNameUA),
                lastNameEN: utils.capitalizeName(lastNameEN),
                firstNameEN: utils.capitalizeName(firstNameEN),
                photo: isLicensePhotoValid ? photo : '',
                birthday: this.appUtils.convertDate(birthday) || defaultValue,
                birthPlace: birthAddress?.address || defaultValue,
                expirationDate: this.appUtils.convertDate(dend) || defaultValue!,
                departmentId: departmentId?.toString() || defaultValue,
                department: department?.toUpperCase() || defaultValue,
                serialNumber: serialNumber.toUpperCase(),
                categories: categories.map(({ category }) => category).join(', '),
                categoriesFull: categories,
                recordNumber: unzr || defaultValue,
                ua: this.toLocaleDetails(client, license, birthAddress, categories, unzr, Localization.UA),
                eng: this.toLocaleDetails(client, license, birthAddress, categories, unzr, Localization.ENG),
            }

            if (isExpiredIssuedFirst) {
                inactiveLicenseEntries.push(licenseEntity)
            } else {
                licenseEntities.push(licenseEntity)
            }
        })

        return licenseEntities.length ? licenseEntities : inactiveLicenseEntries
    }

    // TODO(BACK-3092) create and use common entity
    toDocumentInstance(document: RegistryDriverLicenseDTO, unzr: string | undefined): DocumentInstance[] {
        this.printStatInfo(document)

        const licenseEntities: DocumentInstance[] = []
        const inactiveLicenseEntries: DocumentInstance[] = []

        const { driverLicense, client, clientAddr } = document
        const { lastNameUA, firstNameUA, middleNameUA, lastNameEN, firstNameEN, birthday } = client
        const [birthAddress] = this.birthAddressesOnly(clientAddr)
        const driverLicenses: DriverLicenseDocumentDTO[] = this.availableLicensesOnly(driverLicense)

        driverLicenses.forEach((license: DriverLicenseDocumentDTO) => {
            const {
                id,
                dend,
                department: { VALUE: departmentName },
                photo,
                sdoc,
                ndoc,
                ddoc,
            } = license

            const type: LicenseType = this.getLicenseType(license)
            const isLicensePhotoValid = Boolean(photo && isBase64(photo))
            const isExpiredIssuedFirst = type === LicenseType.issuedFirst && this.appUtils.isExpiredDate(dend)
            const issuedDate = this.appUtils.convertDate(ddoc)
            const docStatus = this.getDocStatus(license, client, isLicensePhotoValid, isExpiredIssuedFirst)
            const categories = this.licenseCategories(license.categories)
            const serialNumber = `${sdoc}${ndoc}`

            if (!this.config[DocumentType.DriverLicense].returnExpired && !isExpiredIssuedFirst && this.appUtils.isExpiredDate(dend)) {
                return
            }

            const validUntil = this.appUtils.convertDate(dend) || DefaultValue.NotProvided

            const [tickerUa, tickerEn] = [Localization.UA, Localization.ENG].map((localization) =>
                this.documentAttributesService.getTicker({
                    code: DocumentTickerCode.ValidUntil,
                    templateParams: {
                        [DocumentTickerPlaceholder.ValidUntil]: validUntil,
                        [DocumentTickerPlaceholder.UpdatedAt]: this.documentAttributesService.getUpdatedAtValue(),
                    },
                    localization,
                    documentType: DocumentType.DriverLicense,
                }),
            )

            const tickerEnUa = this.documentAttributesService.getTicker({
                code: DocumentTickerCode.UpdatedAtEnUa,
                localization: Localization.ENG,
                templateParams: {
                    [DocumentTickerCode.UpdatedAt]: this.documentAttributesService.getUpdatedAtValue(),
                },
            })

            const birthdayFormatted = this.appUtils.convertDate(birthday)
            const categoriesFormatted = categories.map(({ category }) => category).join(', ')

            const [lastNameUa, firstNameUa, middleNameUa] = [lastNameUA, firstNameUA, middleNameUA].map((name) =>
                utils.capitalizeName(name),
            )
            const [lastNameEn, firstNameEn] = [lastNameEN, firstNameEN].map((name) => utils.capitalizeName(name))

            const fullNameUa = utils.getFullName(lastNameUa, firstNameUa, middleNameUa)
            const fullNameUaWithSeparator = utils.getFullName(lastNameUa, firstNameUa, middleNameUa, '\n')
            const fullNameEnWithSeparator = utils.getFullName(lastNameEn, firstNameEn, undefined, '\n')
            const fullNameHash = this.appUtils.createFullNameHash(lastNameUA, firstNameUA, middleNameUA)

            const categoryOpeningDate =
                categories.length === 1
                    ? categories[0].openDate
                    : categories.map(({ category, openDate }) => `${category} / ${openDate}`).join(';\n')

            const licenseEntity: DocumentInstance = {
                id: String(id),
                docStatus,
                docNumber: serialNumber,
                content: [
                    {
                        image: isLicensePhotoValid ? photo : '',
                        code: DocumentMediaAlias.Photo,
                    },
                ],
                docData: {
                    docName: this.docNameByLocaleMap[Localization.UA],
                    fullName: fullNameUa,
                    fullNameHash,
                    birthday: birthdayFormatted || DefaultValue.NotProvided,
                    expirationDate: dend ? this.appUtils.convertDate(dend) : undefined,
                    category: categoriesFormatted,
                    licenseType: type,
                    dataIssued: issuedDate,
                },
                dataForDisplayingInOrderConfigurations: {
                    iconRight: {
                        code: ActionCode.drag,
                    },
                    label: serialNumber,
                    description: `Дійсне до: ${validUntil}`,
                },
                frontCard: {
                    UA: this.designSystemDataMapper.getFrontCardWithPhotoDefault(
                        this.docNameByLocaleMap[Localization.UA],
                        DocumentTypeCamelCase.driverLicense,
                        fullNameUaWithSeparator,
                        tickerUa,
                        [
                            {
                                tableItemVerticalMlc: {
                                    componentId: this.designSystemDataMapper.getComponentIdWithLocale(
                                        ComponentIdFrontCard.BirthDate,
                                        Localization.UA,
                                        ComponentDocumentName.DriverLicense,
                                    ),
                                    label: 'Дата\nнародження:',
                                    value: birthdayFormatted || DefaultValue.NotProvided,
                                    valueIcons: [],
                                    valueImages: [],
                                },
                            },
                            {
                                tableItemVerticalMlc: {
                                    componentId: this.designSystemDataMapper.getComponentIdWithLocale(
                                        ComponentIdFrontCard.Category,
                                        Localization.UA,
                                        ComponentDocumentName.DriverLicense,
                                    ),
                                    label: 'Категорія:',
                                    value: categoriesFormatted,
                                    valueIcons: [],
                                    valueImages: [],
                                },
                            },
                            {
                                tableItemVerticalMlc: {
                                    componentId: this.designSystemDataMapper.getComponentIdWithLocale(
                                        ComponentIdFrontCard.DocNumber,
                                        Localization.UA,
                                        ComponentDocumentName.DriverLicense,
                                    ),
                                    label: 'Номер\nдокумента:',
                                    value: serialNumber,
                                    valueIcons: [],
                                    valueImages: [],
                                },
                            },
                        ],
                        Localization.UA,
                    ),
                    EN: this.designSystemDataMapper.getFrontCardWithPhotoDefault(
                        this.docNameByLocaleMap[Localization.ENG],
                        DocumentTypeCamelCase.driverLicense,
                        fullNameEnWithSeparator,
                        tickerEn,
                        [
                            {
                                tableItemVerticalMlc: {
                                    componentId: this.designSystemDataMapper.getComponentIdWithLocale(
                                        ComponentIdFrontCard.BirthDate,
                                        Localization.ENG,
                                        ComponentDocumentName.DriverLicense,
                                    ),
                                    label: 'Date of birth:',
                                    value: birthdayFormatted || DefaultValue.NotProvidedEN,
                                    valueIcons: [],
                                    valueImages: [],
                                },
                            },
                            {
                                tableItemVerticalMlc: {
                                    componentId: this.designSystemDataMapper.getComponentIdWithLocale(
                                        ComponentIdFrontCard.Category,
                                        Localization.ENG,
                                        ComponentDocumentName.DriverLicense,
                                    ),
                                    label: 'Category:',
                                    value: categoriesFormatted,
                                    valueIcons: [],
                                    valueImages: [],
                                },
                            },
                            {
                                tableItemVerticalMlc: {
                                    componentId: this.designSystemDataMapper.getComponentIdWithLocale(
                                        ComponentIdFrontCard.DocNumber,
                                        Localization.ENG,
                                        ComponentDocumentName.DriverLicense,
                                    ),
                                    label: 'Licence\nnumber:',
                                    value: serialNumber,
                                    valueIcons: [],
                                    valueImages: [],
                                },
                            },
                        ],
                        Localization.ENG,
                    ),
                },
                fullInfo: [
                    {
                        docHeadingOrg: {
                            componentId: ComponentIdFullInfo.Heading,
                            headingWithSubtitlesMlc: {
                                componentId: ComponentIdFullInfo.DocName,
                                value: this.docNameByLocaleMap[Localization.ENG],
                                subtitles: [this.docNameByLocaleMap[Localization.UA], 'Ukraine • Україна'],
                            },
                            docNumberCopyMlc: {
                                componentId: ComponentIdFullInfo.DocNumberHeading,
                                value: serialNumber,
                                icon: {
                                    code: ActionCode.copy,
                                    action: {
                                        type: IconAtmActionType.copy,
                                    },
                                },
                            },
                        },
                    },
                    {
                        tickerAtm: {
                            ...tickerEnUa,
                            componentId: ComponentIdFullInfo.Ticker,
                        },
                    },
                    {
                        tableBlockOrg: {
                            componentId: ComponentIdFullInfo.DocDataOwner,
                            items: [
                                {
                                    tableItemHorizontalMlc: {
                                        componentId: ComponentIdFullInfo.Surname,
                                        supportingValue: '1.',
                                        label: 'Прізвище:',
                                        secondaryLabel: 'Surname',
                                        value: lastNameUa,
                                        secondaryValue: lastNameEn,
                                    },
                                },
                                {
                                    tableItemHorizontalMlc: {
                                        componentId: ComponentIdFullInfo.GivenNames,
                                        supportingValue: '2.',
                                        label: 'Імʼя та по батькові:',
                                        secondaryLabel: 'Given names',
                                        value: `${firstNameUa} ${middleNameUa}`,
                                        secondaryValue: firstNameEn,
                                    },
                                },
                                {
                                    tableItemHorizontalMlc: {
                                        componentId: ComponentIdFullInfo.BirthDate,
                                        supportingValue: '3.',
                                        label: 'Дата і місце народження:',
                                        secondaryLabel: 'Date and place of birth',
                                        value: [birthdayFormatted, birthAddress?.address].join('\n'),
                                    },
                                },
                            ],
                        },
                    },
                    {
                        tableBlockOrg: {
                            componentId: ComponentIdFullInfo.DocDataIssue,
                            items: [
                                {
                                    tableItemHorizontalMlc: {
                                        componentId: ComponentIdFullInfo.IssueDate,
                                        supportingValue: '4a.',
                                        label: 'Дата видачі:',
                                        secondaryLabel: 'Date of issue',
                                        value: issuedDate || DefaultValue.NotProvided,
                                    },
                                },
                                {
                                    tableItemHorizontalMlc: {
                                        componentId: ComponentIdFullInfo.ExpiryDate,
                                        supportingValue: '4b.',
                                        label: 'Дійсний до:',
                                        secondaryLabel: 'Date of expiry',
                                        value: validUntil,
                                    },
                                },
                                {
                                    tableItemHorizontalMlc: {
                                        componentId: ComponentIdFullInfo.Authority,
                                        supportingValue: '4c.',
                                        label: 'Орган, що видав:',
                                        secondaryLabel: 'Authority',
                                        value: departmentName?.toUpperCase() || DefaultValue.NotProvided,
                                    },
                                },
                                {
                                    tableItemHorizontalMlc: {
                                        componentId: ComponentIdFullInfo.Unzr,
                                        supportingValue: '4d.',
                                        label: 'Запис № (УНЗР):',
                                        secondaryLabel: 'Record No.',
                                        value: unzr || DefaultValue.NotProvided,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        tableBlockOrg: {
                            componentId: ComponentIdFullInfo.DocDataDetails,
                            items: [
                                {
                                    tableItemHorizontalMlc: {
                                        componentId: ComponentIdFullInfo.DocNumber,
                                        supportingValue: '5',
                                        label: 'Номер документа:',
                                        secondaryLabel: 'Licence number',
                                        value: serialNumber,
                                    },
                                },
                                {
                                    tableItemHorizontalMlc: {
                                        componentId: ComponentIdFullInfo.Category,
                                        supportingValue: '9',
                                        label: 'Категорія:',
                                        secondaryLabel: 'Category',
                                        value: categoriesFormatted,
                                    },
                                },
                                {
                                    tableItemVerticalMlc: {
                                        componentId: ComponentIdFullInfo.CategoryIssueDate,
                                        supportingValue: '10',
                                        label: 'Дата відкриття категорії:',
                                        secondaryLabel: 'Category issuing date',
                                        value: categoryOpeningDate,
                                        valueIcons: [],
                                        valueImages: [],
                                    },
                                },
                            ],
                        },
                    },
                ],
            }

            if (isExpiredIssuedFirst) {
                inactiveLicenseEntries.push(licenseEntity)

                return
            }

            licenseEntities.push(licenseEntity)
        })

        return licenseEntities.length ? licenseEntities : inactiveLicenseEntries
    }

    // TODO(BACK-3092) create and use common entity
    toVerifyDocumentInstance(driverLicense: DriverLicense, localization: Localization): DocumentInstance {
        const {
            id,
            docStatus,
            docNumber,
            lastNameUA,
            firstNameUA,
            middleNameUA,
            lastNameEN,
            firstNameEN,
            photo,
            birthday,
            categories,
            type,
            fullNameHash,
            expirationDate,
        } = driverLicense

        const fullNameUa = utils.getFullName(lastNameUA, firstNameUA, middleNameUA)
        const fullNameUaWithSeparator = utils.getFullName(lastNameUA, firstNameUA, middleNameUA, '\n')
        const fullNameEnWithSeparator = utils.getFullName(lastNameEN, firstNameEN, undefined, '\n')
        const docName = this.docNameByLocaleMap[localization]

        const tickerAtmUA = this.documentAttributesService.getTicker({
            code: DocumentTickerCode.Valid,
            localization: Localization.UA,
        })

        const tickerAtmEN = this.documentAttributesService.getTicker({
            code: DocumentTickerCode.Valid,
            localization: Localization.ENG,
        })

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
                fullName: fullNameUa,
                fullNameHash,
                birthday: birthday || undefined,
                expirationDate,
                category: categories,
                licenseType: type,
            },
            frontCard: {
                UA:
                    localization === Localization.UA
                        ? this.designSystemDataMapper.getFrontCardWithPhotoDefault(
                              this.docNameByLocaleMap[Localization.UA],
                              DocumentTypeCamelCase.driverLicense,
                              fullNameUaWithSeparator,
                              tickerAtmUA,
                              [
                                  {
                                      tableItemVerticalMlc: {
                                          label: 'Дата\nнародження:',
                                          value: birthday || DefaultValue.NotProvided,
                                          valueIcons: [],
                                          valueImages: [],
                                      },
                                  },
                                  {
                                      tableItemVerticalMlc: {
                                          label: 'Категорія:',
                                          value: categories,
                                          valueIcons: [],
                                          valueImages: [],
                                      },
                                  },
                                  {
                                      tableItemVerticalMlc: {
                                          label: 'Номер\nдокумента:',
                                          value: docNumber,
                                          valueIcons: [],
                                          valueImages: [],
                                      },
                                  },
                              ],
                              Localization.UA,
                              true,
                          )
                        : [],
                EN:
                    localization === Localization.ENG
                        ? this.designSystemDataMapper.getFrontCardWithPhotoDefault(
                              this.docNameByLocaleMap[Localization.ENG],
                              DocumentTypeCamelCase.driverLicense,
                              fullNameEnWithSeparator,
                              tickerAtmEN,
                              [
                                  {
                                      tableItemVerticalMlc: {
                                          label: 'Date of birth:',
                                          value: birthday || DefaultValue.NotProvidedEN,
                                          valueIcons: [],
                                          valueImages: [],
                                      },
                                  },
                                  {
                                      tableItemVerticalMlc: {
                                          label: 'Category:',
                                          value: categories,
                                          valueIcons: [],
                                          valueImages: [],
                                      },
                                  },
                                  {
                                      tableItemVerticalMlc: {
                                          label: 'Licence\nnumber:',
                                          value: docNumber,
                                          valueIcons: [],
                                          valueImages: [],
                                      },
                                  },
                              ],
                              Localization.ENG,
                              true,
                          )
                        : [],
            },
            fullInfo: [],
        }
    }

    toFullEntity(document: RegistryDriverLicenseDTO): DriverLicenseFull {
        this.printStatInfo(document)

        return this.getFullEntity(document)
    }

    enrichUserProfileDocument(profileDocument: UserProfileDocument, document: DriverLicense): UserProfileDocument {
        const { type } = document

        profileDocument.documentSubType = type ? this.licenseTypeToSubType[type] : undefined

        return profileDocument
    }

    private getFullEntity(document: RegistryDriverLicenseDTO): DriverLicenseFull {
        const driverLicensesDTO: DriverLicenseDocumentDTO[] = this.availableLicensesOnly(document.driverLicense)
        const driverLicenses: DriverLicenseDocument[] = driverLicensesDTO.map(
            (driverLicenseDTO: DriverLicenseDocumentDTO): DriverLicenseDocument => {
                const { id, dend, sdoc, ndoc, department, photo, status, categories } = driverLicenseDTO

                return {
                    id,
                    dend,
                    sdoc,
                    ndoc,
                    department,
                    photo,
                    status,
                    categories: this.licenseCategories(categories).map(({ category }) => category),
                }
            },
        )

        return {
            driverLicense: driverLicenses,
            client: document.client,
            clientAddr: this.birthAddressesOnly(document.clientAddr),
        }
    }

    private toLocaleDetails(
        client: Client,
        license: DriverLicenseDocumentDTO,
        birthAddress: ClientAddress,
        categories: DriverLicenseCategory[],
        unzr: string | undefined,
        localization: Localization,
    ): DriverLicenseDetails {
        const {
            sdoc,
            ndoc,
            ddoc,
            dend,
            department: { VALUE: departmentValue },
        } = license
        const defaultValue = this.defaultValueByLocalization[localization]

        const docNumber = `${sdoc}${ndoc}`
        const lastNameUA = utils.capitalizeName(client.lastNameUA)
        const firstNameUA = utils.capitalizeName(client.firstNameUA)
        const middleNameUA = utils.capitalizeName(client.middleNameUA)
        const lastNameEN = utils.capitalizeName(client.lastNameEN)
        const firstNameEN = utils.capitalizeName(client.firstNameEN)
        const birthday = this.appUtils.convertDate(client.birthday) || defaultValue
        const birthPlace = birthAddress?.address || defaultValue
        const issueDate = this.appUtils.convertDate(ddoc) || defaultValue
        const expirationDate = this.appUtils.convertDate(dend) || defaultValue
        const department = departmentValue?.toUpperCase() || defaultValue
        const recordNumber = unzr || defaultValue
        const categoryName = categories.map(({ category }) => category).join(', ')
        const categoryOpeningDate =
            categories.length === 1
                ? categories[0].openDate
                : categories.map(({ category, openDate }) => `${category} / ${openDate}`).join(';\n')

        const icon = this.documentAttributesService.getTrident(DocumentType.DriverLicense)
        const tickerOptions = this.documentAttributesService.getTickerV1(
            DocumentType.DriverLicense,
            DocumentTickerCode.ValidUntil,
            localization,
            {
                [DocumentTickerPlaceholder.ValidUntil]: expirationDate,
            },
        )

        switch (localization) {
            case Localization.UA: {
                return {
                    card: {
                        name: this.docNameByLocaleMap[Localization.UA],
                        icon,
                        lastName: lastNameUA,
                        firstName: firstNameUA,
                        middleName: middleNameUA,
                        birthDate: { name: 'Дата народження', value: birthday },
                        category: { name: 'Категорія', value: categoryName },
                        documentNumber: { name: 'Номер документа', value: docNumber },
                    },
                    name: this.docNameByLocaleMap[Localization.UA],
                    icon,
                    country: 'Україна',
                    lastName: { code: '1.', name: 'Прізвище', value: lastNameUA },
                    firstName: { code: '2.', name: 'Ім’я та по батькові', value: `${firstNameUA} ${middleNameUA}` },
                    birthDate: { name: 'Дата народження', value: birthday },
                    birth: { code: '3.', name: 'Дата та місце народження', value: `${birthday}\n${birthPlace}` },
                    issueDate: { code: '4а.', name: 'Дата видачі', value: issueDate },
                    expiryDate: { code: '4b.', name: 'Дійсний до', value: expirationDate },
                    department: { code: '4с.', name: 'Орган, що видав', value: department },
                    identifier: { code: '4d.', name: 'УНЗР', value: recordNumber },
                    documentNumber: { code: '5.', name: 'Номер документа', value: docNumber },
                    category: { code: '9.', name: 'Категорія', value: categoryName },
                    categoryOpeningDate: { code: '10.', name: 'Дата відкриття категорії', value: categoryOpeningDate },
                    categories: categories.map(({ category, openDate }) => ({
                        category: { code: '9.', name: 'Категорія', value: category },
                        openingDate: { code: '10.', name: 'Дата відкриття категорії', value: openDate },
                    })),
                    tickerOptions,
                }
            }
            case Localization.ENG: {
                return {
                    card: {
                        name: this.docNameByLocaleMap[Localization.ENG],
                        icon,
                        lastName: lastNameEN,
                        firstName: firstNameEN,
                        birthDate: { name: 'Date of birth', value: birthday },
                        category: { name: 'Category', value: categoryName },
                        documentNumber: { name: 'Licence number', value: docNumber },
                    },
                    name: this.docNameByLocaleMap[Localization.ENG],
                    icon,
                    country: 'Ukraine',
                    lastName: { code: '1.', name: 'Surname:', value: lastNameEN },
                    firstName: { code: '2.', name: 'Given name(s):', value: firstNameEN },
                    birthDate: { name: 'Date of birth:', value: birthday },
                    birth: { code: '3.', name: 'Date and place of birth:', value: `${birthday}\n${birthPlace}` },
                    issueDate: { code: '4а.', name: 'Date of issue:', value: issueDate },
                    expiryDate: { code: '4b.', name: 'Expiry date:', value: expirationDate },
                    department: { code: '4с.', name: 'Issuing authority:', value: department },
                    identifier: { code: '4d.', name: 'Record number:', value: recordNumber },
                    documentNumber: { code: '5.', name: 'Licence number:', value: docNumber },
                    category: { code: '9.', name: 'Category:', value: categoryName },
                    categoryOpeningDate: { code: '10.', name: 'Category issuing date:', value: categoryOpeningDate },
                    categories: categories.map(({ category, openDate }) => ({
                        category: { code: '9.', name: 'Category:', value: category },
                        openingDate: { code: '10.', name: 'Category issuing date:', value: openDate },
                    })),
                    tickerOptions,
                }
            }
        }
    }

    private printStatInfo(registryDocument: RegistryDriverLicenseDTO): void {
        const statInfo: { driverLicenseStatistics: { [key: string]: number } } = {
            driverLicenseStatistics: {
                inRegistry: (registryDocument.driverLicense || []).length,
                withoutPhoto: this.licensesWithoutPhotoOnly(registryDocument.driverLicense).length,
                statusUndefined: this.migrationLicensesOnly(registryDocument.driverLicense).length,
                statusNew: this.issuedLicensesOnly(registryDocument.driverLicense).length,
                statusStay: this.stayLicensesOnly(registryDocument.driverLicense).length,
                statusReturn: this.returnedLicensesOnly(registryDocument.driverLicense).length,
                statusConfirm: this.needConfirmationLicenseOnly(registryDocument.driverLicense).length,
            },
        }

        this.logger.info('Stat info', statInfo)
    }

    private licenseCategories(categories: Category[]): DriverLicenseCategory[] {
        return categories.map(({ category, dopen }) => {
            const key = <keyof typeof LicenseCategory>category.toUpperCase()
            const mappedCategory = LicenseCategory[key] || category

            return {
                category: mappedCategory,
                openDate: this.appUtils.convertDate(dopen)!,
            }
        })
    }

    private availableLicensesOnly(licenses: DriverLicenseDocumentDTO[]): DriverLicenseDocumentDTO[] {
        return licenses.filter(this.isAvailableLicense)
    }

    private isAvailableLicense(license: DriverLicenseDocumentDTO): boolean {
        return [
            DocumentStatus.ISSUED,
            DocumentStatus.STAY,
            DocumentStatus.RETURNED_AFTER_KEEPING,
            DocumentStatus.MIGRATION,
            DocumentStatus.NEED_CONFIRMATION,
        ].includes(Number(license.status.ID))
    }

    private issuedLicensesOnly(licenses: DriverLicenseDocumentDTO[]): DriverLicenseDocumentDTO[] {
        return licenses.filter(this.isIssuedLicense)
    }

    private isIssuedLicense(license: DriverLicenseDocumentDTO): boolean {
        return parseInt(<string>license.status.ID, 10) === DocumentStatus.ISSUED
    }

    private stayLicensesOnly(licenses: DriverLicenseDocumentDTO[]): DriverLicenseDocumentDTO[] {
        return licenses.filter(this.isStayLicense)
    }

    private isStayLicense(license: DriverLicenseDocumentDTO): boolean {
        return parseInt(<string>license.status.ID, 10) === DocumentStatus.STAY
    }

    private returnedLicensesOnly(licenses: DriverLicenseDocumentDTO[]): DriverLicenseDocumentDTO[] {
        return licenses.filter(this.isReturnedLicense)
    }

    private isReturnedLicense(license: DriverLicenseDocumentDTO): boolean {
        return parseInt(<string>license.status.ID, 10) === DocumentStatus.RETURNED_AFTER_KEEPING
    }

    private needConfirmationLicenseOnly(licenses: DriverLicenseDocumentDTO[]): DriverLicenseDocumentDTO[] {
        return licenses.filter(this.isNeedConfirmationLicense)
    }

    private isNeedConfirmationLicense(license: DriverLicenseDocumentDTO): boolean {
        return parseInt(<string>license.status.ID, 10) === DocumentStatus.NEED_CONFIRMATION
    }

    private migrationLicensesOnly(licenses: DriverLicenseDocumentDTO[]): DriverLicenseDocumentDTO[] {
        return licenses.filter(this.isLicenseInMigration)
    }

    private isLicenseInMigration(license: DriverLicenseDocumentDTO): boolean {
        return parseInt(<string>license.status.ID, 10) === DocumentStatus.MIGRATION
    }

    private licensesWithoutPhotoOnly(licenses: DriverLicenseDocumentDTO[]): DriverLicenseDocumentDTO[] {
        return licenses.filter(this.isLicenseHasNoPhoto)
    }

    private isLicenseHasNoPhoto(license: DriverLicenseDocumentDTO): boolean {
        return license.photo === null
    }

    private birthAddressesOnly(addresses: ClientAddress[]): ClientAddress[] {
        return addresses.filter(this.isBirthAddress)
    }

    private isBirthAddress(address: ClientAddress): boolean {
        return parseInt(<string>address.addressType.ID, 10) === AddressType.BIRTH
    }

    private getDocStatus(
        license: DriverLicenseDocumentDTO,
        client: Client,
        isLicensePhotoValid: boolean,
        isExpiredIssuedFirst: boolean,
    ): DocStatus {
        const fieldsToVerifyLicense: string[] = ['categories', 'sdoc', 'ndoc']
        if (fieldsToVerifyLicense.some((field: string) => !get(license, field))) {
            return DocStatus.AdditionalVerification
        }

        if (!license.categories?.length) {
            return DocStatus.AdditionalVerification
        }

        const fieldsToVerifyClient: Partial<keyof Client>[] = ['lastNameUA', 'firstNameUA', 'birthday']

        if (fieldsToVerifyClient.some((field) => !client[field])) {
            return DocStatus.AdditionalVerification
        }

        if (!this.config[DocumentType.DriverLicense].returnExpired && isExpiredIssuedFirst) {
            return DocStatus.Inactive
        }

        if (this.isNeedConfirmationLicense(license)) {
            return DocStatus.OldModel
        }

        if (!isLicensePhotoValid) {
            return DocStatus.NoPhoto
        }

        return DocStatus.Ok
    }

    private getLicenseType(license: DriverLicenseDocumentDTO): LicenseType {
        const { ddoc, dend } = license
        const issueDate = moment(ddoc)
        const expirationDate = moment(dend)
        const isLicenseIssuedFirst = expirationDate.diff(issueDate, 'years') <= 2

        if (isLicenseIssuedFirst) {
            return LicenseType.issuedFirst
        }

        return LicenseType.permanent
    }
}
