import { ExternalCommunicator } from '@diia-inhouse/diia-queue'
import TestKit from '@diia-inhouse/test'
import {
    ActionCode,
    DocStatus,
    DocumentType,
    DocumentTypeCamelCase,
    HttpStatusCode,
    Icon,
    IconAtmActionType,
    TickerAtmType,
    TickerAtmUsage,
} from '@diia-inhouse/types'

import DocumentsDrfoProvider from '@src/documents/taxpayerCard/providers/drfo/index'

import GetDocumentsAction from '@actions/v6/getDocuments'

import DocumentsService from '@services/documents'
import DocumentsExpirationService from '@services/documentsExpiration'
import UserService from '@services/user'

import { getPassport } from '@tests/mocks/stubs/providers/eis/passport'
import { getApp } from '@tests/utils/getApp'

import { ActionResult } from '@interfaces/actions/v6/getDocuments'
import { DefaultValue, DocumentMediaAlias, DocumentTypeResponse } from '@interfaces/services/documents'

describe(`Action ${GetDocumentsAction.name}`, () => {
    const testKit = new TestKit()

    let app: Awaited<ReturnType<typeof getApp>>
    let getDocumentsAction: GetDocumentsAction
    let external: ExternalCommunicator
    let userService: UserService
    let documentsService: DocumentsService
    let documentsDrfoProvider: DocumentsDrfoProvider
    let documentsExpirationService: DocumentsExpirationService

    beforeAll(async () => {
        app = await getApp()

        getDocumentsAction = app.container.build(GetDocumentsAction)
        external = app.container.resolve('external')
        userService = app.container.resolve<UserService>('userService')
        documentsService = app.container.resolve<DocumentsService>('documentsService')
        documentsDrfoProvider = app.container.resolve<DocumentsDrfoProvider>('documentsDrfoProvider')
        documentsExpirationService = app.container.resolve<DocumentsExpirationService>('documentsExpirationService')

        await app.start()
    })

    afterAll(async () => {
        await app.stop()
    })

    describe('should return documents by design system', () => {
        it(`should return foreign and id passports`, async () => {
            // Arrange
            const actionArgs = testKit.session.getUserActionArguments({}, {}, { validItn: true })

            const taxpayerCardSpy = jest.spyOn(documentsDrfoProvider, 'getTaxpayerCard').mockResolvedValue({
                card: {
                    isVisible: true,
                    id: '123',
                    docStatus: DocStatus.Ok,
                    docNumber: '123',
                    lastNameUA: 'lastNameUa',
                    firstNameUA: 'firstNameUA',
                    middleNameUA: 'middleNameUA',
                    birthday: '13.01.1990',
                    creationDate: '13.02.1992',
                },
            })
            const documentSpy = jest.spyOn(external, 'receiveDirect').mockResolvedValue(getPassport())

            const getDocumentsOrderSpy = jest.spyOn(userService, 'getDocumentsOrder').mockImplementation(async () =>
                Object.values(DocumentType).map((documentType) => ({
                    documentType,
                })),
            )

            jest.spyOn(userService, 'checkDocumentsFeaturePoints').mockResolvedValue({ documents: [] })

            // Act
            const result = await getDocumentsAction.handler({
                ...actionArgs,
                params: { filter: [DocumentType.ForeignPassport, DocumentType.InternalPassport] },
            })

            // Assert
            expect(taxpayerCardSpy).toHaveBeenCalledTimes(1)
            expect(getDocumentsOrderSpy).toHaveBeenCalledTimes(1)
            expect(documentSpy).toHaveBeenCalledTimes(1)
            expect(result).toEqual<ActionResult>({
                idCard: {
                    status: HttpStatusCode.OK,
                    data: [
                        {
                            id: '20000213-01467-2016-03-09',
                            docStatus: DocStatus.Ok,
                            docNumber: '000031886',
                            content: [
                                {
                                    image: expect.any(String),
                                    code: DocumentMediaAlias.Photo,
                                },
                                {
                                    image: expect.any(String),
                                    code: DocumentMediaAlias.Signature,
                                },
                            ],
                            docData: {
                                docName: 'Паспорт громадянина України',
                                birthday: '13.02.2000',
                                fullName: 'Дія Надія Володимирівна',
                                fullNameHash: expect.any(String),
                                expirationDate: '09.03.2026',
                                dataIssued: '09.03.2016',
                            },
                            dataForDisplayingInOrderConfigurations: {
                                description: 'Дата видачі: 09.03.2016',
                                iconRight: {
                                    code: ActionCode.drag,
                                },
                                label: '000031886',
                            },
                            frontCard: {
                                UA: [
                                    {
                                        docHeadingOrg: {
                                            componentId: 'heading_ua',
                                            headingWithSubtitlesMlc: {
                                                componentId: 'doc_name_ua',
                                                value: 'Паспорт громадянина\nУкраїни',
                                                subtitles: [],
                                            },
                                        },
                                    },
                                    {
                                        tableBlockTwoColumnsPlaneOrg: {
                                            componentId: 'doc_data_ua',
                                            photo: DocumentMediaAlias.Photo,
                                            items: [
                                                {
                                                    tableItemVerticalMlc: {
                                                        label: 'Дата\nнародження:',
                                                        value: '13.02.2000',
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
                                            usage: TickerAtmUsage.document,
                                            type: TickerAtmType.positive,
                                            value: expect.any(String),
                                            action: undefined,
                                            componentId: 'ticker_ua',
                                        },
                                    },
                                    {
                                        docButtonHeadingOrg: {
                                            componentId: 'bottom_heading_ua',
                                            headingWithSubtitlesMlc: {
                                                componentId: 'full_name_ua',
                                                value: 'Дія\nНадія\nВолодимирівна',
                                                subtitles: [],
                                            },
                                            iconAtm: {
                                                componentId: 'icon_ua',
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
                                        usage: TickerAtmUsage.document,
                                        type: TickerAtmType.positive,
                                        value: expect.any(String),
                                        action: undefined,
                                    },
                                },
                                {
                                    tableBlockTwoColumnsOrg: {
                                        headingWithSubtitlesMlc: {
                                            value: 'Дія Надія\nВолодимирівна',
                                            subtitles: ['Diia Nadiia Volodymyrivna'],
                                        },
                                        photo: DocumentMediaAlias.Photo,
                                        items: [
                                            {
                                                tableItemVerticalMlc: {
                                                    label: 'Дата\nнародження:',
                                                    secondaryLabel: 'Date of birth',
                                                    value: '13.02.2000',
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
                                                    value: '09.03.2016',
                                                },
                                            },
                                            {
                                                tableItemHorizontalMlc: {
                                                    label: 'Дійсний до:',
                                                    secondaryLabel: 'Date of expiry',
                                                    value: '09.03.2026',
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
                                    tableBlockOrg: {
                                        items: [
                                            {
                                                tableItemHorizontalMlc: {
                                                    label: 'РНОКПП (ІПН):',
                                                    secondaryLabel: 'Individual Tax Number',
                                                    value: expect.any(String),
                                                    icon: {
                                                        code: ActionCode.copy,
                                                        action: {
                                                            type: IconAtmActionType.copy,
                                                        },
                                                    },
                                                },
                                            },
                                            {
                                                tableItemVerticalMlc: {
                                                    value: 'Пройшов перевірку Державною податковою службою 13.02.1992',
                                                    secondaryValue: 'Verified by State Tax Service on 13.02.1992',
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
                                                    label: 'Запис № (УНЗР):',
                                                    secondaryLabel: 'Record No.',
                                                    value: '20000213-01467',
                                                    icon: {
                                                        code: ActionCode.copy,
                                                        action: {
                                                            type: IconAtmActionType.copy,
                                                        },
                                                    },
                                                },
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
                    unavailableData: undefined,
                    currentDate: expect.any(String),
                    expirationDate: expect.any(String),
                },
                foreignPassport: {
                    status: HttpStatusCode.OK,
                    data: [
                        {
                            id: '20000213-01467-2016-05-12',
                            docStatus: DocStatus.Ok,
                            docNumber: 'FC449752',
                            content: [
                                {
                                    image: expect.any(String),
                                    code: DocumentMediaAlias.Photo,
                                },
                                {
                                    image: expect.any(String),
                                    code: DocumentMediaAlias.Signature,
                                },
                            ],
                            docData: {
                                docName: 'Закордонний паспорт',
                                birthday: '13.02.2000',
                                fullName: 'Дія Надія',
                                fullNameHash: expect.any(String),
                                expirationDate: '12.05.2026',
                                dataIssued: '12.05.2016',
                            },
                            dataForDisplayingInOrderConfigurations: {
                                description: 'Дата видачі: 12.05.2016',
                                iconRight: {
                                    code: ActionCode.drag,
                                },
                                label: 'FC449752',
                            },
                            frontCard: {
                                UA: [
                                    {
                                        docHeadingOrg: {
                                            componentId: 'heading_ua',
                                            headingWithSubtitlesMlc: {
                                                componentId: 'doc_name_ua',
                                                value: 'Закордонний\nпаспорт',
                                                subtitles: [],
                                            },
                                        },
                                    },
                                    {
                                        tableBlockTwoColumnsPlaneOrg: {
                                            componentId: 'doc_data_ua',
                                            photo: DocumentMediaAlias.Photo,
                                            items: [
                                                {
                                                    tableItemVerticalMlc: {
                                                        label: 'Дата\nнародження:',
                                                        value: '13.02.2000',
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
                                            usage: TickerAtmUsage.document,
                                            type: TickerAtmType.positive,
                                            value: expect.any(String),
                                            action: undefined,
                                            componentId: 'ticker_ua',
                                        },
                                    },
                                    {
                                        docButtonHeadingOrg: {
                                            componentId: 'bottom_heading_ua',
                                            headingWithSubtitlesMlc: {
                                                componentId: 'full_name_ua',
                                                value: 'Дія\nНадія',
                                                subtitles: [],
                                            },
                                            iconAtm: {
                                                componentId: 'icon_ua',
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
                                            componentId: 'heading_eng',
                                            headingWithSubtitlesMlc: {
                                                componentId: 'doc_name_eng',
                                                value: 'International\nPassport',
                                                subtitles: [],
                                            },
                                        },
                                    },
                                    {
                                        tableBlockTwoColumnsPlaneOrg: {
                                            componentId: 'doc_data_eng',
                                            photo: DocumentMediaAlias.Photo,
                                            items: [
                                                {
                                                    tableItemVerticalMlc: {
                                                        label: 'Date of birth:',
                                                        value: '13.02.2000',
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
                                            usage: TickerAtmUsage.document,
                                            type: TickerAtmType.positive,
                                            value: expect.any(String),
                                            action: undefined,
                                            componentId: 'ticker_eng',
                                        },
                                    },
                                    {
                                        docButtonHeadingOrg: {
                                            componentId: 'bottom_heading_eng',
                                            headingWithSubtitlesMlc: {
                                                componentId: 'full_name_eng',
                                                value: 'Diia\nNadiia',
                                                subtitles: [],
                                            },
                                            iconAtm: {
                                                componentId: 'icon_eng',
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
                                        usage: TickerAtmUsage.document,
                                        type: TickerAtmType.positive,
                                        value: expect.any(String),
                                        action: undefined,
                                    },
                                },
                                {
                                    tableBlockTwoColumnsOrg: {
                                        headingWithSubtitlesMlc: {
                                            value: 'Дія Надія',
                                            subtitles: ['Diia Nadiia'],
                                        },
                                        photo: DocumentMediaAlias.Photo,
                                        items: [
                                            {
                                                tableItemVerticalMlc: {
                                                    label: 'Дата\nнародження:',
                                                    secondaryLabel: 'Date of birth',
                                                    value: '13.02.2000',
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
                                                    value: '12.05.2016',
                                                },
                                            },
                                            {
                                                tableItemHorizontalMlc: {
                                                    label: 'Дійсний до:',
                                                    secondaryLabel: 'Date of expiry',
                                                    value: '12.05.2026',
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
                                    tableBlockOrg: {
                                        items: [
                                            {
                                                tableItemHorizontalMlc: {
                                                    label: 'РНОКПП (ІПН):',
                                                    secondaryLabel: 'Individual Tax Number',
                                                    value: expect.any(String),
                                                    icon: {
                                                        code: ActionCode.copy,
                                                        action: {
                                                            type: IconAtmActionType.copy,
                                                        },
                                                    },
                                                },
                                            },
                                            {
                                                tableItemVerticalMlc: {
                                                    value: 'Пройшов перевірку Державною податковою службою 13.02.1992',
                                                    secondaryValue: 'Verified by State Tax Service on 13.02.1992',
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
                                                    label: 'Запис № (УНЗР):',
                                                    secondaryLabel: 'Record No.',
                                                    value: '20000213-01467',
                                                    icon: {
                                                        code: ActionCode.copy,
                                                        action: {
                                                            type: IconAtmActionType.copy,
                                                        },
                                                    },
                                                },
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
                                                    value: expect.any(String),
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    ],
                    unavailableData: undefined,
                    currentDate: expect.any(String),
                    expirationDate: expect.any(String),
                },
                documentsTypeOrder: expect.arrayContaining(['foreignPassport', 'idCard']),
            })
        })

        it(`should return taxpayer card`, async () => {
            // Arrange
            const actionArgs = testKit.session.getUserActionArguments({}, {}, { validItn: true })
            const taxpayerCardMock = testKit.docs.getTaxpayerCard()
            const taxpayerCardSpy = jest.spyOn(documentsDrfoProvider, 'getTaxpayerCard').mockResolvedValue({
                card: taxpayerCardMock,
            })

            const getDocumentsOrderSpy = jest.spyOn(userService, 'getDocumentsOrder').mockImplementation(async () =>
                Object.values(DocumentType).map((documentType) => ({
                    documentType,
                })),
            )

            jest.spyOn(userService, 'checkDocumentsFeaturePoints').mockResolvedValue({ documents: [] })

            // Act
            const result = await getDocumentsAction.handler({
                ...actionArgs,
                params: { filter: [DocumentType.TaxpayerCard] },
            })

            // Assert
            expect(taxpayerCardSpy).toHaveBeenCalledTimes(2)
            expect(getDocumentsOrderSpy).toHaveBeenCalledTimes(1)
            expect(result).toEqual({
                taxpayerCard: {
                    status: HttpStatusCode.OK,
                    data: [
                        {
                            id: taxpayerCardMock.id,
                            docStatus: DocStatus.Ok,
                            docNumber: taxpayerCardMock.docNumber,
                            content: [],
                            fullInfo: [],
                            docData: {
                                docName: 'Картка платника податків',
                                birthday: taxpayerCardMock.birthday,
                                rnokpp: taxpayerCardMock.docNumber,
                                fullName: 'Дія Надія Володимирівна',
                            },
                            dataForDisplayingInOrderConfigurations: {
                                iconRight: {
                                    code: ActionCode.drag,
                                },
                                label: taxpayerCardMock.docNumber,
                                description: 'Пройшов перевірку Державною податковою службою 13.09.2023',
                            },
                            frontCard: {
                                UA: [
                                    {
                                        docHeadingOrg: {
                                            headingWithSubtitlesMlc: {
                                                value: 'Картка платника\nподатків',
                                                subtitles: [],
                                            },
                                        },
                                    },
                                    {
                                        subtitleLabelMlc: {
                                            label: 'РНОКПП',
                                        },
                                    },
                                    {
                                        tableBlockPlaneOrg: {
                                            tableSecondaryHeadingMlc: {
                                                label: 'Дія\nНадія\nВолодимирівна',
                                            },
                                            items: [
                                                {
                                                    tableItemVerticalMlc: {
                                                        label: 'Дата народження:',
                                                        value: taxpayerCardMock.birthday,
                                                        valueIcons: [],
                                                        valueImages: [],
                                                    },
                                                },
                                            ],
                                        },
                                    },
                                    {
                                        tickerAtm: {
                                            usage: TickerAtmUsage.document,
                                            type: TickerAtmType.positive,
                                            value: expect.any(String),
                                        },
                                    },
                                    {
                                        docButtonHeadingOrg: {
                                            docNumberCopyMlc: {
                                                value: taxpayerCardMock.docNumber,
                                                icon: {
                                                    code: ActionCode.copy,
                                                    action: {
                                                        type: IconAtmActionType.copy,
                                                    },
                                                },
                                            },
                                            iconAtm: {
                                                code: Icon.ellipseKebab,
                                                accessibilityDescription: DocumentTypeCamelCase.taxpayerCard,
                                                action: {
                                                    type: IconAtmActionType.ellipseMenu,
                                                    subtype: DocumentTypeCamelCase.taxpayerCard,
                                                },
                                            },
                                        },
                                    },
                                ],
                                EN: [],
                            },
                        },
                    ],
                    unavailableData: undefined,
                    currentDate: expect.any(String),
                    expirationDate: expect.any(String),
                },
                documentsTypeOrder: expect.arrayContaining(['taxpayerCard']),
            })
        })
    })

    it('should not return document that is not expired', async () => {
        // Arrange
        const actionArgs = testKit.session.getUserActionArguments({}, {}, { validItn: true })
        const filter = [DocumentType.InternalPassport]
        const userDocumentsOrder = [{ documentType: DocumentType.InternalPassport }]

        jest.spyOn(userService, 'checkDocumentsFeaturePoints').mockResolvedValueOnce({ documents: [] })
        jest.spyOn(userService, 'getDocumentsOrder').mockResolvedValueOnce(userDocumentsOrder)
        jest.spyOn(userService, 'getDecryptedDataFromStorage').mockResolvedValue({
            [DocumentType.InternalPassport]: [{ id: 'unique-doc-number' }],
        })
        jest.spyOn(documentsExpirationService, 'checkDocumentExpiration').mockReturnValueOnce({
            currentDate: new Date().toISOString(),
            expirationDate: new Date().toISOString(),
        })

        // Act
        const result = await getDocumentsAction.handler({ ...actionArgs, params: { filter } })

        // Assert
        expect(result).toEqual<ActionResult>({
            [documentsService.documentTypeToDocumentTypeResponse[DocumentType.InternalPassport]!]: {
                status: HttpStatusCode.FORBIDDEN,
                data: [],
                currentDate: expect.any(String),
                expirationDate: expect.any(String),
            },
            documentsTypeOrder: [DocumentTypeResponse.IdCard],
        })
    })
})
