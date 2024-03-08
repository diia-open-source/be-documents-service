import { DocumentNotFoundError } from '@diia-inhouse/errors'
import { mockInstance } from '@diia-inhouse/test'
import {
    ActionCode,
    DocumentInstance,
    DocumentTypeCamelCase,
    Icon,
    IconAtmActionType,
    PassportGenderEN,
    PassportGenderUA,
    PassportType,
    TableBlockOrg,
    TableItemMlc,
    TickerAtm,
    TickerAtmType,
    TickerAtmUsage,
} from '@diia-inhouse/types'

import DocumentAttributesService from '@services/documentAttributes'

import DesignSystemDataMapper from '@dataMappers/designSystemDataMapper'
import PassportDataMapper from '@dataMappers/passportDataMapper'
import RegistrationAddressDataMapper from '@dataMappers/registrationAddressDataMapper'

import Utils from '@utils/index'

import { getPassport } from '@tests/mocks/stubs/providers/eis/passport'

import { AppConfig } from '@interfaces/config'
import { RegistryPassportDTO } from '@interfaces/dto'
import { DefaultValue, DocumentMediaAlias } from '@interfaces/services/documents'

describe('PassportDataMapper', () => {
    const designSystemDataMapperMock = mockInstance(DesignSystemDataMapper)
    const documentAttributesServiceMock = mockInstance(DocumentAttributesService)
    const registrationAddressDataMapperMock = mockInstance(RegistrationAddressDataMapper)
    const utilsMock = mockInstance(Utils)
    const config = <AppConfig>{ app: { dateFormat: 'DD.MM.YYYY' }, eis: { returnExpired: false } }
    const passportDataMapper = new PassportDataMapper(
        utilsMock,
        config,
        designSystemDataMapperMock,
        registrationAddressDataMapperMock,
        documentAttributesServiceMock,
    )

    describe('method toDocumentInstanceV1', () => {
        it('should successfully compose and return passports list', () => {
            const passport = getPassport()

            jest.spyOn(utilsMock, 'isValidDate').mockReturnValue(true)

            expect(passportDataMapper.toDocumentInstanceV1(passport)).toEqual([
                {
                    birthPlaceEN: 'UKR',
                    birthPlaceUA: 'ДОНЕЦЬКА ОБЛ.',
                    birthday: 'Не вказано',
                    countryCode: 'UKR',
                    currentRegistrationPlaceUA: 'Не вказано',
                    departmentEN: '1455',
                    departmentUA: '1455',
                    docNumber: 'FC449752',
                    docStatus: 200,
                    documentRegistrationPlaceUA: 'Не вказано',
                    eng: {
                        birthDate: {
                            name: 'Date of birth:',
                            value: 'Not Provided',
                        },
                        birthPlace: {
                            name: 'Place of birth:',
                            value: 'UKR',
                        },
                        card: {
                            birthDate: {
                                name: 'Date of birth',
                                value: 'Not Provided',
                            },
                            docNumber: {
                                name: 'Document\nnumber',
                                value: 'FC449752',
                            },
                            firstName: 'Nadiia',
                            icon: undefined,
                            lastName: 'Diia',
                            name: 'International\nPassport',
                        },
                        country: 'Ukraine',
                        countryCode: {
                            name: 'Country code:',
                            value: 'UKR',
                        },
                        department: {
                            name: 'Authority:',
                            value: '1455',
                        },
                        docNumber: {
                            name: 'Document number',
                            value: 'FC449752',
                        },
                        expiryDate: {
                            name: 'Date of expiry:',
                            value: undefined,
                        },
                        firstName: 'Nadiia',
                        gender: {
                            name: 'Sex:',
                            value: 'F',
                        },
                        icon: undefined,
                        identifier: {
                            name: 'Record No.:',
                            value: '20000213-01467',
                        },
                        issueDate: {
                            name: 'Date of issue:',
                            value: undefined,
                        },
                        lastName: 'Diia',
                        name: 'International Passport',
                        nationality: {
                            name: 'Nationality:',
                            value: 'Ukraine',
                        },
                        registrationDate: {
                            name: 'Registered on:',
                            value: 'Not Provided',
                        },
                        residenceRegistrationPlace: {
                            name: 'Legal address:',
                            value: 'Not Provided',
                        },
                        type: {
                            name: 'Type:',
                            value: 'P',
                        },
                    },
                    expirationDate: undefined,
                    firstNameEN: 'Nadiia',
                    firstNameUA: 'Надія',
                    fullNameHash: undefined,
                    genderEN: 'F',
                    genderUA: 'Ж',
                    id: '20000213-01467-2016-05-12',
                    issueDate: undefined,
                    lastNameEN: 'Diia',
                    lastNameUA: 'Дія',
                    middleNameUA: '',
                    nationalityEN: 'Ukraine',
                    nationalityUA: 'Україна',
                    number: '449752',
                    photo: passport.documents[0].photo,
                    recordNumber: '20000213-01467',
                    series: 'FC',
                    sign: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2MQmjHnIAAEDgIIZO6vHgAAAABJRU5ErkJggg==',
                    tickerOptions: undefined,
                    type: 'P',
                    typeEN: 'P',
                    typeUA: 'P',
                    ua: {
                        birthDate: {
                            name: 'Дата народження',
                            value: 'Не вказано',
                        },
                        birthPlace: {
                            name: 'Місце народження',
                            value: 'ДОНЕЦЬКА ОБЛ.',
                        },
                        card: {
                            birthDate: {
                                name: 'Дата\nнародження',
                                value: 'Не вказано',
                            },
                            docNumber: {
                                name: 'Номер',
                                value: 'FC449752',
                            },
                            firstName: 'Надія',
                            icon: undefined,
                            lastName: 'Дія',
                            middleName: '',
                            name: 'Закордонний\nпаспорт',
                        },
                        country: 'Україна',
                        countryCode: {
                            name: 'Код держави',
                            value: 'UKR',
                        },
                        department: {
                            name: 'Орган, що видав',
                            value: '1455',
                        },
                        docNumber: {
                            name: 'Номер',
                            value: 'FC449752',
                        },
                        expiryDate: {
                            name: 'Дійсний до',
                            value: undefined,
                        },
                        firstName: 'Надія ',
                        gender: {
                            name: 'Стать',
                            value: 'Ж',
                        },
                        icon: undefined,
                        identifier: {
                            name: 'Запис № (УНЗР)',
                            value: '20000213-01467',
                        },
                        issueDate: {
                            name: 'Дата видачі',
                            value: undefined,
                        },
                        lastName: 'Дія',
                        name: 'Закордонний паспорт',
                        nationality: {
                            name: 'Громадянство',
                            value: 'Україна',
                        },
                        registrationDate: {
                            name: 'Дата реєстрації',
                            value: 'Не вказано',
                        },
                        residenceRegistrationPlace: {
                            name: 'Місце реєстрації проживання',
                            value: 'Не вказано',
                        },
                        type: {
                            name: 'Тип',
                            value: 'P',
                        },
                    },
                },
                {
                    birthPlaceEN: 'M.  SLOVIANSK DONETSKA OBLAST UKRAINA/UKR',
                    birthPlaceUA: 'М. СЛОВ`ЯНСЬК ДОНЕЦЬКА ОБЛАСТЬ УКРАЇНА',
                    birthday: 'Не вказано',
                    currentRegistrationPlaceUA: 'Не вказано',
                    department: '1455',
                    docNumber: '000031886',
                    docStatus: 200,
                    documentRegistrationPlaceUA: 'Не вказано',
                    expirationDate: undefined,
                    firstNameEN: 'Nadiia',
                    firstNameUA: 'Надія',
                    fullNameHash: undefined,
                    genderEN: 'F',
                    genderUA: 'Ж',
                    id: '20000213-01467-2016-03-09',
                    issueDate: undefined,
                    lastNameEN: 'Diia',
                    lastNameUA: 'Дія',
                    middleNameUA: 'Володимирівна',
                    nationalityEN: 'Ukraine',
                    nationalityUA: 'Україна',
                    number: '000031886',
                    photo: passport.documents[1].photo,
                    recordNumber: '20000213-01467',
                    sign: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2MQmjHnIAAEDgIIZO6vHgAAAABJRU5ErkJggg==',
                    type: 'ID',
                },
            ])
        })

        it('should fail with error in case there is no valid documents', () => {
            const passport = getPassport()

            jest.spyOn(utilsMock, 'isValidDate').mockReturnValue(false)

            expect(() => {
                passportDataMapper.toDocumentInstanceV1(passport)
            }).toThrow(new DocumentNotFoundError())
        })
    })

    describe('method toDocumentInstance', () => {
        const passport = getPassport()
        const taxpayerCardTableOrg: TableBlockOrg = {
            items: [],
        }

        it.each(<[PassportType, DocumentInstance[]][]>[
            [
                PassportType.ID,
                [
                    {
                        id: '20000213-01467-2016-03-09',
                        docStatus: 200,
                        docNumber: '000031886',
                        content: [
                            {
                                image: passport.documents[1].photo,
                                code: 'photo',
                            },
                            {
                                image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2MQmjHnIAAEDgIIZO6vHgAAAABJRU5ErkJggg==',
                                code: 'signature',
                            },
                        ],
                        docData: {
                            docName: 'Паспорт громадянина України',
                            birthday: 'Не вказано',
                            fullName: 'Дія Надія Володимирівна',
                        },
                        dataForDisplayingInOrderConfigurations: {
                            iconRight: {
                                code: ActionCode.drag,
                            },
                            label: '000031886',
                            description: 'Дата видачі: Не вказано',
                        },
                        frontCard: {
                            UA: [
                                {
                                    docHeadingOrg: {
                                        headingWithSubtitlesMlc: {
                                            value: 'Паспорт громадянина\nУкраїни',
                                            subtitles: [],
                                        },
                                    },
                                },
                                {
                                    tableBlockTwoColumnsPlaneOrg: {
                                        photo: 'photo',
                                        items: [
                                            {
                                                tableItemVerticalMlc: {
                                                    label: 'Дата\nнародження:',
                                                    value: 'Не вказано',
                                                    valueIcons: [],
                                                    valueImages: [],
                                                },
                                            },
                                            {
                                                tableItemVerticalMlc: {
                                                    label: 'Номер:',
                                                    value: '000031886',
                                                    valueIcons: [],
                                                    valueImages: [],
                                                },
                                            },
                                            {
                                                tableItemVerticalMlc: {
                                                    valueImage: 'signature',
                                                    valueIcons: [],
                                                    valueImages: [],
                                                },
                                            },
                                        ],
                                    },
                                },
                                {
                                    tickerAtm: {
                                        type: 'positive',
                                        usage: 'document',
                                        value: 'value',
                                    },
                                },
                                {
                                    docButtonHeadingOrg: {
                                        headingWithSubtitlesMlc: {
                                            value: 'Дія\nНадія\nВолодимирівна',
                                            subtitles: [],
                                        },
                                        iconAtm: {
                                            code: Icon.ellipseKebab,
                                            accessibilityDescription: DocumentTypeCamelCase.idCard,
                                            action: {
                                                type: IconAtmActionType.ellipseMenu,
                                                subtype: DocumentTypeCamelCase.idCard,
                                            },
                                        },
                                    },
                                },
                            ],
                            EN: [],
                        },
                        fullInfo: [
                            {
                                docHeadingOrg: {
                                    headingWithSubtitlesMlc: {
                                        value: 'Паспорт громадянина\nУкраїни',
                                        subtitles: [],
                                    },
                                    docNumberCopyMlc: {
                                        value: '000031886',
                                        icon: {
                                            code: 'copy',
                                            action: {
                                                type: 'copy',
                                            },
                                        },
                                    },
                                },
                            },
                            {
                                tickerAtm: {
                                    type: 'positive',
                                    usage: 'document',
                                    value: 'value',
                                },
                            },
                            {
                                tableBlockTwoColumnsOrg: {
                                    headingWithSubtitlesMlc: {
                                        value: 'Дія Надія\nВолодимирівна',
                                        subtitles: ['Diia Nadiia Volodymyrivna'],
                                    },
                                    photo: 'photo',
                                    items: [
                                        {
                                            tableItemVerticalMlc: {
                                                label: 'Дата\nнародження:',
                                                secondaryLabel: 'Date of birth',
                                                value: 'Не вказано',
                                                valueIcons: [],
                                                valueImages: [],
                                            },
                                        },
                                        {
                                            tableItemVerticalMlc: {
                                                valueImage: 'signature',
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
                                                value: 'Ж',
                                                secondaryValue: 'F',
                                            },
                                        },
                                        {
                                            tableItemHorizontalMlc: {
                                                label: 'Громадянство:',
                                                secondaryLabel: 'Nationality',
                                                value: 'Україна',
                                                secondaryValue: 'Ukraine',
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
                                                value: DefaultValue.NotProvided,
                                            },
                                        },
                                        {
                                            tableItemHorizontalMlc: {
                                                label: 'Дійсний до:',
                                                secondaryLabel: 'Date of expiry',
                                                value: DefaultValue.NotProvided,
                                            },
                                        },
                                        {
                                            tableItemHorizontalMlc: {
                                                label: 'Орган, що видав:',
                                                secondaryLabel: 'Authority',
                                                value: '1455',
                                            },
                                        },
                                    ],
                                },
                            },
                            {
                                tableBlockOrg: taxpayerCardTableOrg,
                            },
                            {
                                tableBlockOrg: {
                                    items: [
                                        {
                                            tableItemHorizontalMlc: undefined,
                                        },
                                        {
                                            tableItemHorizontalMlc: {
                                                label: 'Місце народження:',
                                                secondaryLabel: 'Place of birth',
                                                value: 'М. СЛОВ`ЯНСЬК ДОНЕЦЬКА ОБЛАСТЬ УКРАЇНА',
                                            },
                                        },
                                        {
                                            tableItemVerticalMlc: {
                                                label: 'Місце проживання:',
                                                secondaryLabel: 'Legal address',
                                                value: 'Не вказано',
                                                valueIcons: [],
                                                valueImages: [],
                                            },
                                        },
                                        {
                                            tableItemHorizontalMlc: {
                                                label: 'Дата реєстрації:',
                                                secondaryLabel: 'Registered on',
                                                value: DefaultValue.NotProvided,
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                ],
            ],
            [
                PassportType.P,
                [
                    {
                        id: '20000213-01467-2016-05-12',
                        docStatus: 200,
                        docNumber: 'FC449752',
                        content: [
                            {
                                image: passport.documents[0].photo,
                                code: 'photo',
                            },
                            {
                                image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2MQmjHnIAAEDgIIZO6vHgAAAABJRU5ErkJggg==',
                                code: 'signature',
                            },
                        ],
                        docData: {
                            docName: 'Закордонний паспорт',
                            birthday: 'Не вказано',
                            fullName: 'Дія Надія',
                        },
                        dataForDisplayingInOrderConfigurations: {
                            iconRight: {
                                code: ActionCode.drag,
                            },
                            label: 'FC449752',
                            description: 'Дата видачі: Не вказано',
                        },
                        frontCard: {
                            UA: [
                                {
                                    docHeadingOrg: {
                                        headingWithSubtitlesMlc: {
                                            value: 'Закордонний\nпаспорт',
                                            subtitles: [],
                                        },
                                    },
                                },
                                {
                                    tableBlockTwoColumnsPlaneOrg: {
                                        photo: 'photo',
                                        items: [
                                            {
                                                tableItemVerticalMlc: {
                                                    label: 'Дата\nнародження:',
                                                    value: 'Не вказано',
                                                    valueIcons: [],
                                                    valueImages: [],
                                                },
                                            },
                                            {
                                                tableItemVerticalMlc: {
                                                    label: 'Номер:',
                                                    value: 'FC449752',
                                                    valueIcons: [],
                                                    valueImages: [],
                                                },
                                            },
                                            {
                                                tableItemVerticalMlc: {
                                                    valueImage: 'signature',
                                                    valueIcons: [],
                                                    valueImages: [],
                                                },
                                            },
                                        ],
                                    },
                                },
                                {
                                    tickerAtm: {
                                        type: 'positive',
                                        usage: 'document',
                                        value: 'value',
                                    },
                                },
                                {
                                    docButtonHeadingOrg: {
                                        headingWithSubtitlesMlc: {
                                            value: 'Дія\nНадія',
                                            subtitles: [],
                                        },
                                        iconAtm: {
                                            code: Icon.ellipseKebab,
                                            accessibilityDescription: DocumentTypeCamelCase.foreignPassport,
                                            action: {
                                                type: IconAtmActionType.ellipseMenu,
                                                subtype: DocumentTypeCamelCase.foreignPassport,
                                            },
                                        },
                                    },
                                },
                            ],
                            EN: [
                                {
                                    docHeadingOrg: {
                                        headingWithSubtitlesMlc: {
                                            value: 'International\nPassport',
                                            subtitles: [],
                                        },
                                    },
                                },
                                {
                                    tableBlockTwoColumnsPlaneOrg: {
                                        photo: 'photo',
                                        items: [
                                            {
                                                tableItemVerticalMlc: {
                                                    label: 'Date of birth:',
                                                    value: 'Not Provided',
                                                    valueIcons: [],
                                                    valueImages: [],
                                                },
                                            },
                                            {
                                                tableItemVerticalMlc: {
                                                    label: 'Document\nnumber:',
                                                    value: 'FC449752',
                                                    valueIcons: [],
                                                    valueImages: [],
                                                },
                                            },
                                            {
                                                tableItemVerticalMlc: {
                                                    valueImage: 'signature',
                                                    valueIcons: [],
                                                    valueImages: [],
                                                },
                                            },
                                        ],
                                    },
                                },
                                {
                                    tickerAtm: {
                                        type: 'positive',
                                        usage: 'document',
                                        value: 'value',
                                    },
                                },
                                {
                                    docButtonHeadingOrg: {
                                        headingWithSubtitlesMlc: {
                                            value: 'Diia\nNadiia',
                                            subtitles: [],
                                        },
                                        iconAtm: {
                                            code: Icon.ellipseKebab,
                                            accessibilityDescription: DocumentTypeCamelCase.foreignPassport,
                                            action: {
                                                type: IconAtmActionType.ellipseMenu,
                                                subtype: DocumentTypeCamelCase.foreignPassport,
                                            },
                                        },
                                    },
                                },
                            ],
                        },
                        fullInfo: [
                            {
                                docHeadingOrg: {
                                    headingWithSubtitlesMlc: {
                                        value: 'International Passport',
                                        subtitles: ['Закордонний паспорт', 'Ukraine • Україна'],
                                    },
                                    docNumberCopyMlc: {
                                        value: 'FC449752',
                                        icon: {
                                            code: 'copy',
                                            action: {
                                                type: 'copy',
                                            },
                                        },
                                    },
                                },
                            },
                            {
                                tickerAtm: {
                                    type: 'positive',
                                    usage: 'document',
                                    value: 'value',
                                },
                            },
                            {
                                tableBlockTwoColumnsOrg: {
                                    headingWithSubtitlesMlc: {
                                        value: 'Дія Надія\nВолодимирівна',
                                        subtitles: ['Diia Nadiia'],
                                    },
                                    photo: 'photo',
                                    items: [
                                        {
                                            tableItemVerticalMlc: {
                                                label: 'Дата\nнародження:',
                                                secondaryLabel: 'Date of birth',
                                                value: DefaultValue.NotProvided,
                                                valueIcons: [],
                                                valueImages: [],
                                            },
                                        },
                                        {
                                            tableItemVerticalMlc: {
                                                valueImage: 'signature',
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
                                                value: 'Ж',
                                                secondaryValue: 'F',
                                            },
                                        },
                                        {
                                            tableItemHorizontalMlc: {
                                                label: 'Громадянство:',
                                                secondaryLabel: 'Nationality',
                                                value: 'Україна',
                                                secondaryValue: 'Ukraine',
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
                                                value: DefaultValue.NotProvided,
                                            },
                                        },
                                        {
                                            tableItemHorizontalMlc: {
                                                label: 'Дійсний до:',
                                                secondaryLabel: 'Date of expiry',
                                                value: DefaultValue.NotProvided,
                                            },
                                        },
                                        {
                                            tableItemHorizontalMlc: {
                                                label: 'Орган, що видав:',
                                                secondaryLabel: 'Authority',
                                                value: '1455',
                                            },
                                        },
                                    ],
                                },
                            },
                            {
                                tableBlockOrg: taxpayerCardTableOrg,
                            },
                            {
                                tableBlockOrg: {
                                    items: [
                                        {
                                            tableItemHorizontalMlc: undefined,
                                        },
                                        {
                                            tableItemHorizontalMlc: {
                                                label: 'Тип:',
                                                secondaryLabel: 'Type',
                                                value: 'P',
                                            },
                                        },
                                        {
                                            tableItemHorizontalMlc: {
                                                label: 'Код держави:',
                                                secondaryLabel: 'Country code',
                                                value: 'UKR',
                                            },
                                        },
                                        {
                                            tableItemHorizontalMlc: {
                                                label: 'Місце народження:',
                                                secondaryLabel: 'Place of birth',
                                                value: 'ДОНЕЦЬКА ОБЛ.',
                                            },
                                        },
                                    ],
                                },
                            },
                            {
                                tableBlockOrg: {
                                    items: [
                                        {
                                            tableItemVerticalMlc: {
                                                label: 'Місце проживання:',
                                                secondaryLabel: 'Legal address',
                                                value: 'Не вказано',
                                                valueIcons: [],
                                                valueImages: [],
                                            },
                                        },
                                        {
                                            tableItemHorizontalMlc: {
                                                label: 'Дата реєстрації:',
                                                secondaryLabel: 'Registered on',
                                                value: DefaultValue.NotProvided,
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                ],
            ],
        ])('should successfully transform and return list of document instances when passport type is %s', (type, expectedResult) => {
            jest.spyOn(utilsMock, 'isValidDate').mockReturnValue(true)
            jest.spyOn(documentAttributesServiceMock, 'getDefaultTicker').mockReturnValue({
                type: TickerAtmType.positive,
                usage: TickerAtmUsage.document,
                value: 'value',
            })
            jest.spyOn(documentAttributesServiceMock, 'getTicker').mockReturnValue({
                type: TickerAtmType.positive,
                usage: TickerAtmUsage.document,
                value: 'value',
            })
            jest.spyOn(designSystemDataMapperMock, 'getFrontCardWithPhotoDefault').mockImplementation(
                (docName: string, docType: DocumentTypeCamelCase, fullName: string, ticker: TickerAtm, items: TableItemMlc[]) => [
                    {
                        docHeadingOrg: {
                            headingWithSubtitlesMlc: {
                                value: docName,
                                subtitles: [],
                            },
                        },
                    },
                    {
                        tableBlockTwoColumnsPlaneOrg: {
                            photo: DocumentMediaAlias.Photo,
                            items,
                        },
                    },
                    { tickerAtm: ticker },
                    {
                        docButtonHeadingOrg: {
                            headingWithSubtitlesMlc: {
                                value: fullName,
                                subtitles: [],
                            },
                            iconAtm: {
                                code: Icon.ellipseKebab,
                                accessibilityDescription: docType,
                                action: {
                                    type: IconAtmActionType.ellipseMenu,
                                    subtype: docType,
                                },
                            },
                        },
                    },
                ],
            )

            jest.spyOn(utilsMock, 'getFullNameWithSeparatedMiddleName').mockReturnValue('Дія Надія\nВолодимирівна')

            const result = passportDataMapper.toDocumentInstance(type, passport, taxpayerCardTableOrg)

            expect(result).toEqual(expectedResult)

            expect(utilsMock.isValidDate).toHaveBeenCalledWith(passport.documents[1].date_issue)
            expect(utilsMock.isValidDate).toHaveBeenCalledWith(passport.documents[1].date_expiry)
        })

        it('should return empty list in case document is invalid', () => {
            const type = PassportType.P

            jest.spyOn(utilsMock, 'isValidDate').mockReturnValueOnce(false).mockReturnValueOnce(false)

            const result = passportDataMapper.toDocumentInstance(type, passport, taxpayerCardTableOrg)

            expect(result).toEqual([])

            expect(utilsMock.isValidDate).toHaveBeenCalledWith(passport.documents[1].date_issue)
            expect(utilsMock.isValidDate).toHaveBeenCalledWith(passport.documents[1].date_expiry)
        })
    })

    describe('method mapPassports', () => {
        const defaultPassport = getPassport()

        it.each([
            [
                'successfully map passports list in case registration address is string',
                defaultPassport,
                undefined,
                [
                    {
                        docStatus: 200,
                        docNumber: 'FC449752',
                        series: 'FC',
                        number: '449752',
                        id: '20000213-01467-2016-05-12',
                        lastNameUA: 'Дія',
                        firstNameUA: 'Надія',
                        middleNameUA: '',
                        lastNameEN: 'Diia',
                        firstNameEN: 'Nadiia',
                        fullNameHash: undefined,
                        genderUA: 'Ж',
                        genderEN: 'F',
                        nationalityUA: 'Україна',
                        nationalityEN: 'Ukraine',
                        photo: defaultPassport.documents[0].photo,
                        birthday: 'Не вказано',
                        sign: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2MQmjHnIAAEDgIIZO6vHgAAAABJRU5ErkJggg==',
                        birthPlaceUA: 'ДОНЕЦЬКА ОБЛ.',
                        birthPlaceEN: 'UKR',
                        issueDate: undefined,
                        expirationDate: undefined,
                        recordNumber: '20000213-01467',
                        type: 'P',
                        documentRegistrationPlaceUA: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69.\nДата реєстрації: 05.10.2007',
                        currentRegistrationPlaceUA: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69.\nДата реєстрації: 05.10.2007',
                        departmentUA: '1455',
                        departmentEN: '1455',
                        typeUA: 'P',
                        typeEN: 'P',
                        countryCode: 'UKR',
                        tickerOptions: undefined,
                        ua: {
                            card: {
                                name: 'Закордонний\nпаспорт',
                                icon: undefined,
                                lastName: 'Дія',
                                firstName: 'Надія',
                                middleName: '',
                                birthDate: {
                                    name: 'Дата\nнародження',
                                    value: 'Не вказано',
                                },
                                docNumber: {
                                    name: 'Номер',
                                    value: 'FC449752',
                                },
                            },
                            name: 'Закордонний паспорт',
                            icon: undefined,
                            country: 'Україна',
                            docNumber: {
                                name: 'Номер',
                                value: 'FC449752',
                            },
                            lastName: 'Дія',
                            firstName: 'Надія ',
                            gender: {
                                name: 'Стать',
                                value: 'Ж',
                            },
                            birthDate: {
                                name: 'Дата народження',
                                value: 'Не вказано',
                            },
                            nationality: {
                                name: 'Громадянство',
                                value: 'Україна',
                            },
                            department: {
                                name: 'Орган, що видав',
                                value: '1455',
                            },
                            issueDate: {
                                name: 'Дата видачі',
                                value: undefined,
                            },
                            expiryDate: {
                                name: 'Дійсний до',
                                value: undefined,
                            },
                            identifier: {
                                name: 'Запис № (УНЗР)',
                                value: '20000213-01467',
                            },
                            type: {
                                name: 'Тип',
                                value: 'P',
                            },
                            countryCode: {
                                name: 'Код держави',
                                value: 'UKR',
                            },
                            birthPlace: {
                                name: 'Місце народження',
                                value: 'ДОНЕЦЬКА ОБЛ.',
                            },
                            residenceRegistrationPlace: {
                                name: 'Місце реєстрації проживання',
                                value: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69',
                            },
                            registrationDate: {
                                name: 'Дата реєстрації',
                                value: '05.10.2007',
                            },
                        },
                        eng: {
                            card: {
                                name: 'International\nPassport',
                                icon: undefined,
                                lastName: 'Diia',
                                firstName: 'Nadiia',
                                birthDate: {
                                    name: 'Date of birth',
                                    value: 'Not Provided',
                                },
                                docNumber: {
                                    name: 'Document\nnumber',
                                    value: 'FC449752',
                                },
                            },
                            name: 'International Passport',
                            icon: undefined,
                            country: 'Ukraine',
                            docNumber: {
                                name: 'Document number',
                                value: 'FC449752',
                            },
                            lastName: 'Diia',
                            firstName: 'Nadiia',
                            gender: {
                                name: 'Sex:',
                                value: 'F',
                            },
                            birthDate: {
                                name: 'Date of birth:',
                                value: 'Not Provided',
                            },
                            nationality: {
                                name: 'Nationality:',
                                value: 'Ukraine',
                            },
                            department: {
                                name: 'Authority:',
                                value: '1455',
                            },
                            issueDate: {
                                name: 'Date of issue:',
                                value: undefined,
                            },
                            expiryDate: {
                                name: 'Date of expiry:',
                                value: undefined,
                            },
                            identifier: {
                                name: 'Record No.:',
                                value: '20000213-01467',
                            },
                            type: {
                                name: 'Type:',
                                value: 'P',
                            },
                            countryCode: {
                                name: 'Country code:',
                                value: 'UKR',
                            },
                            birthPlace: {
                                name: 'Place of birth:',
                                value: 'UKR',
                            },
                            residenceRegistrationPlace: {
                                name: 'Legal address:',
                                value: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69',
                            },
                            registrationDate: {
                                name: 'Registered on:',
                                value: '05.10.2007',
                            },
                        },
                    },
                    {
                        docStatus: 200,
                        docNumber: '000031886',
                        number: '000031886',
                        id: '20000213-01467-2016-03-09',
                        lastNameUA: 'Дія',
                        firstNameUA: 'Надія',
                        middleNameUA: 'Володимирівна',
                        lastNameEN: 'Diia',
                        firstNameEN: 'Nadiia',
                        fullNameHash: undefined,
                        genderUA: 'Ж',
                        genderEN: 'F',
                        nationalityUA: 'Україна',
                        nationalityEN: 'Ukraine',
                        photo: defaultPassport.documents[1].photo,
                        birthday: 'Не вказано',
                        sign: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2MQmjHnIAAEDgIIZO6vHgAAAABJRU5ErkJggg==',
                        birthPlaceUA: 'М. СЛОВ`ЯНСЬК ДОНЕЦЬКА ОБЛАСТЬ УКРАЇНА',
                        birthPlaceEN: 'M.  SLOVIANSK DONETSKA OBLAST UKRAINA/UKR',
                        issueDate: undefined,
                        expirationDate: undefined,
                        recordNumber: '20000213-01467',
                        type: 'ID',
                        documentRegistrationPlaceUA: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69.\nДата реєстрації: 05.10.2007',
                        currentRegistrationPlaceUA: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69.\nДата реєстрації: 05.10.2007',
                        department: '1455',
                    },
                ],
                (): void => {
                    jest.spyOn(registrationAddressDataMapperMock, 'toEntity').mockReturnValueOnce({
                        registrationAddress: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69',
                        registrationDate: '05.10.2007',
                        koatuu: '8000000000',
                        communityCode: undefined,
                    })
                    jest.spyOn(utilsMock, 'isValidDate').mockReturnValue(true)
                },
                (passport: RegistryPassportDTO): void => {
                    expect(registrationAddressDataMapperMock.toEntity).toHaveBeenCalledWith(passport.registration)
                    passport.documents.forEach(({ date_expiry, date_issue }) => {
                        expect(utilsMock.isValidDate).toHaveBeenCalledWith(date_expiry)
                        expect(utilsMock.isValidDate).toHaveBeenCalledWith(date_issue)
                    })
                },
            ],
            [
                'successfully map passports list in case registration address is object',
                getPassport({ registration: { cbc_country: 'УКРАЇНА', region: 'М. КИЇВ' } }),
                PassportType.P,
                [
                    {
                        docStatus: 200,
                        docNumber: 'FC449752',
                        series: 'FC',
                        number: '449752',
                        id: '20000213-01467-2016-05-12',
                        lastNameUA: 'Дія',
                        firstNameUA: 'Надія',
                        middleNameUA: '',
                        lastNameEN: 'Diia',
                        firstNameEN: 'Nadiia',
                        fullNameHash: undefined,
                        genderUA: 'Ж',
                        genderEN: 'F',
                        nationalityUA: 'Україна',
                        nationalityEN: 'Ukraine',
                        photo: defaultPassport.documents[1].photo,
                        birthday: 'Не вказано',
                        sign: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2MQmjHnIAAEDgIIZO6vHgAAAABJRU5ErkJggg==',
                        birthPlaceUA: 'ДОНЕЦЬКА ОБЛ.',
                        birthPlaceEN: 'UKR',
                        issueDate: undefined,
                        expirationDate: undefined,
                        recordNumber: '20000213-01467',
                        type: 'P',
                        documentRegistrationPlaceUA: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69.\nДата реєстрації: 05.10.2007',
                        currentRegistrationPlaceUA: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69.\nДата реєстрації: 05.10.2007',
                        departmentUA: '1455',
                        departmentEN: '1455',
                        typeUA: 'P',
                        typeEN: 'P',
                        countryCode: 'UKR',
                        tickerOptions: undefined,
                        ua: {
                            card: {
                                name: 'Закордонний\nпаспорт',
                                icon: undefined,
                                lastName: 'Дія',
                                firstName: 'Надія',
                                middleName: '',
                                birthDate: {
                                    name: 'Дата\nнародження',
                                    value: 'Не вказано',
                                },
                                docNumber: {
                                    name: 'Номер',
                                    value: 'FC449752',
                                },
                            },
                            name: 'Закордонний паспорт',
                            icon: undefined,
                            country: 'Україна',
                            docNumber: {
                                name: 'Номер',
                                value: 'FC449752',
                            },
                            lastName: 'Дія',
                            firstName: 'Надія ',
                            gender: {
                                name: 'Стать',
                                value: 'Ж',
                            },
                            birthDate: {
                                name: 'Дата народження',
                                value: 'Не вказано',
                            },
                            nationality: {
                                name: 'Громадянство',
                                value: 'Україна',
                            },
                            department: {
                                name: 'Орган, що видав',
                                value: '1455',
                            },
                            issueDate: {
                                name: 'Дата видачі',
                                value: undefined,
                            },
                            expiryDate: {
                                name: 'Дійсний до',
                                value: undefined,
                            },
                            identifier: {
                                name: 'Запис № (УНЗР)',
                                value: '20000213-01467',
                            },
                            type: {
                                name: 'Тип',
                                value: 'P',
                            },
                            countryCode: {
                                name: 'Код держави',
                                value: 'UKR',
                            },
                            birthPlace: {
                                name: 'Місце народження',
                                value: 'ДОНЕЦЬКА ОБЛ.',
                            },
                            residenceRegistrationPlace: {
                                name: 'Місце реєстрації проживання',
                                value: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69',
                            },
                            registrationDate: {
                                name: 'Дата реєстрації',
                                value: '05.10.2007',
                            },
                        },
                        eng: {
                            card: {
                                name: 'International\nPassport',
                                icon: undefined,
                                lastName: 'Diia',
                                firstName: 'Nadiia',
                                birthDate: {
                                    name: 'Date of birth',
                                    value: 'Not Provided',
                                },
                                docNumber: {
                                    name: 'Document\nnumber',
                                    value: 'FC449752',
                                },
                            },
                            name: 'International Passport',
                            icon: undefined,
                            country: 'Ukraine',
                            docNumber: {
                                name: 'Document number',
                                value: 'FC449752',
                            },
                            lastName: 'Diia',
                            firstName: 'Nadiia',
                            gender: {
                                name: 'Sex:',
                                value: 'F',
                            },
                            birthDate: {
                                name: 'Date of birth:',
                                value: 'Not Provided',
                            },
                            nationality: {
                                name: 'Nationality:',
                                value: 'Ukraine',
                            },
                            department: {
                                name: 'Authority:',
                                value: '1455',
                            },
                            issueDate: {
                                name: 'Date of issue:',
                                value: undefined,
                            },
                            expiryDate: {
                                name: 'Date of expiry:',
                                value: undefined,
                            },
                            identifier: {
                                name: 'Record No.:',
                                value: '20000213-01467',
                            },
                            type: {
                                name: 'Type:',
                                value: 'P',
                            },
                            countryCode: {
                                name: 'Country code:',
                                value: 'UKR',
                            },
                            birthPlace: {
                                name: 'Place of birth:',
                                value: 'UKR',
                            },
                            residenceRegistrationPlace: {
                                name: 'Legal address:',
                                value: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69',
                            },
                            registrationDate: {
                                name: 'Registered on:',
                                value: '05.10.2007',
                            },
                        },
                    },
                ],
                (): void => {
                    jest.spyOn(registrationAddressDataMapperMock, 'toEntity').mockReturnValueOnce({
                        registrationAddress: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69',
                        registrationDate: '05.10.2007',
                        koatuu: '8000000000',
                        communityCode: undefined,
                    })
                    jest.spyOn(registrationAddressDataMapperMock, 'toRegistrationInfo').mockReturnValueOnce({
                        address: {
                            cancelregistrationDate: '',
                            registrationDate: '05.07.2007',
                        },
                    })
                    jest.spyOn(utilsMock, 'isValidDate').mockReturnValue(true)
                },
                (passport: RegistryPassportDTO): void => {
                    expect(registrationAddressDataMapperMock.toEntity).toHaveBeenCalledWith({
                        address: {
                            cancelregistrationDate: '',
                            registrationDate: '05.07.2007',
                        },
                    })
                    passport.documents.forEach(({ date_expiry, date_issue }) => {
                        expect(utilsMock.isValidDate).toHaveBeenCalledWith(date_expiry)
                        expect(utilsMock.isValidDate).toHaveBeenCalledWith(date_issue)
                    })
                },
            ],
            [
                'successfully return empty list in case passport type is unknown',
                getPassport({
                    documents: [
                        { ...defaultPassport.documents[0], type: <PassportType>'unknown' },
                        { ...defaultPassport.documents[1], type: <PassportType>'unknown' },
                    ],
                }),
                undefined,
                [],
                (): void => {
                    jest.spyOn(registrationAddressDataMapperMock, 'toEntity').mockReturnValueOnce({
                        registrationAddress: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69',
                        registrationDate: '05.10.2007',
                        koatuu: '8000000000',
                        communityCode: undefined,
                    })
                    jest.spyOn(utilsMock, 'isValidDate').mockReturnValue(true)
                },
                (passport: RegistryPassportDTO): void => {
                    expect(registrationAddressDataMapperMock.toEntity).toHaveBeenCalledWith(passport.registration)
                    passport.documents.forEach(({ date_expiry, date_issue }) => {
                        expect(utilsMock.isValidDate).toHaveBeenCalledWith(date_expiry)
                        expect(utilsMock.isValidDate).toHaveBeenCalledWith(date_issue)
                    })
                },
            ],
        ])('should %s', (_msg, inputPassport, passportFilter, expectedResult, defineSpies, checkExpectations) => {
            defineSpies()

            const result = passportDataMapper.mapPassports(inputPassport, passportFilter)

            expect(result).toEqual(expectedResult)

            checkExpectations(inputPassport)
        })
    })

    describe('method findIdCard', () => {
        it('should successfully find id card in the list of passports', () => {
            jest.spyOn(utilsMock, 'isValidDate').mockReturnValue(true)

            const passportList = passportDataMapper.mapPassports(getPassport())

            expect(passportDataMapper.findIdCard(passportList)).toEqual(passportList[1])
        })
    })

    describe('method findForeignPassports', () => {
        jest.spyOn(utilsMock, 'isValidDate').mockReturnValue(true)

        const defaultPassportsList = passportDataMapper.mapPassports(getPassport())

        it.each([
            ['find foreign passports list without sorting', defaultPassportsList, {}, [defaultPassportsList[0]]],
            [
                'find foreign passports list and sort them by issue date',
                [
                    { ...defaultPassportsList[0], issueDate: '12.04.2016' },
                    { ...defaultPassportsList[1] },
                    { ...defaultPassportsList[0], issueDate: '12.04.2015' },
                    { ...defaultPassportsList[0], issueDate: '12.04.2012' },
                    { ...defaultPassportsList[0], issueDate: '12.04.2017' },
                    { ...defaultPassportsList[0], issueDate: '12.04.2015' },
                ],
                { sortByDate: true },
                [
                    { ...defaultPassportsList[0], issueDate: '12.04.2017' },
                    { ...defaultPassportsList[0], issueDate: '12.04.2016' },
                    { ...defaultPassportsList[0], issueDate: '12.04.2015' },
                    { ...defaultPassportsList[0], issueDate: '12.04.2015' },
                    { ...defaultPassportsList[0], issueDate: '12.04.2012' },
                ],
            ],
        ])('should successfully %s', (_msg, inputPassports, options, expectedResult) => {
            expect(passportDataMapper.findForeignPassports(inputPassports, options)).toEqual(expectedResult)
        })
    })

    describe('method toFullEntity', () => {
        it.each([
            [PassportGenderEN.F, PassportGenderUA.F],
            [PassportGenderEN.M, PassportGenderUA.M],
            [<PassportGenderEN>'Not specified', DefaultValue.NotProvided],
        ])('should successfully return passport full entity when gender is %s', (enGender, uaGender) => {
            const passportDocument = getPassport({ gender: enGender })

            const expectedResult = {
                data: [
                    {
                        rnokpp: '3656801869',
                        type: 'P',
                        firstNameUA: 'НАДІЯ',
                        middleNameUA: '',
                        lastNameUA: 'ДІЯ',
                        firstNameEN: 'NADIIA',
                        lastNameEN: 'DIIA',
                        middleNameEN: '',
                        birthDate: '2000-02-13',
                        number: 'FC449752',
                        personImage: passportDocument.documents[0].photo,
                        signatureImage: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2MQmjHnIAAEDgIIZO6vHgAAAABJRU5ErkJggg==',
                        genderUA: uaGender,
                        genderEN: enGender,
                        nationalityUA: 'Україна',
                        nationalityEN: 'Ukraine',
                        issueData: '2016-05-12',
                        expirationData: '2026-05-12',
                        authority: '1455',
                        countryCode: 'UKR',
                        birthPlace: 'ДОНЕЦЬКА ОБЛ./UKR',
                        recordNumber: '20000213-01467',
                    },
                    {
                        rnokpp: '3656801869',
                        type: 'ID',
                        firstNameUA: 'НАДІЯ',
                        middleNameUA: 'ВОЛОДИМИРІВНА',
                        lastNameUA: 'ДІЯ',
                        firstNameEN: 'NADIIA',
                        lastNameEN: 'DIIA',
                        middleNameEN: 'VOLODYMYRIVNA',
                        birthDate: '2000-02-13',
                        number: '000031886',
                        personImage: passportDocument.documents[0].photo,
                        signatureImage: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2MQmjHnIAAEDgIIZO6vHgAAAABJRU5ErkJggg==',
                        genderUA: uaGender,
                        genderEN: enGender,
                        nationalityUA: 'Україна',
                        nationalityEN: 'Ukraine',
                        issueData: '2016-03-09',
                        expirationData: '2026-03-09',
                        authority: '1455',
                        countryCode: 'UKR',
                        birthPlace: 'М. СЛОВ`ЯНСЬК ДОНЕЦЬКА ОБЛАСТЬ УКРАЇНА/M.  SLOVIANSK DONETSKA OBLAST UKRAINA/UKR',
                        recordNumber: '20000213-01467',
                    },
                ],
            }

            const result = passportDataMapper.toFullEntity(passportDocument)

            expect(result).toEqual(expectedResult)
        })
    })

    describe('method extractUnzr', () => {
        it('should successfully extract unzr from string', () => {
            expect(passportDataMapper.extractUnzr('20000213-01467-3656801869')).toBe('20000213-01467')
        })
    })
})
