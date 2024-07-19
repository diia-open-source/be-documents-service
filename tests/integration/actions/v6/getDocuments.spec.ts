import { ExternalCommunicator } from '@diia-inhouse/diia-queue'
import TestKit from '@diia-inhouse/test'
import { ActionCode, DocStatus, HttpStatusCode, Icon, IconAtmActionType, TickerAtmType, TickerAtmUsage } from '@diia-inhouse/types'
import { DocumentOrderSettingsItem, UserServiceClient } from '@diia-inhouse/user-service-client'

import DocumentsDrfoProvider from '@src/documents/taxpayerCard/providers/drfo/index'

import GetDocumentsAction from '@actions/v6/getDocuments'

import DocumentsService from '@services/documents'
import DocumentsExpirationService from '@services/documentsExpiration'
import UserService from '@services/user'

import { getPassport } from '@tests/mocks/stubs/providers/eis/passport'
import { getApp } from '@tests/utils/getApp'

import { ActionResult } from '@interfaces/actions/v6/getDocuments'
import { DefaultValue, DocumentMediaAlias } from '@interfaces/services/documents'
import { PassportDocumentType, PassportDocumentTypeCamelCase } from '@interfaces/services/passport'

describe(`Action ${GetDocumentsAction.name}`, () => {
    const testKit = new TestKit()

    let app: Awaited<ReturnType<typeof getApp>>
    let getDocumentsAction: GetDocumentsAction
    let external: ExternalCommunicator
    let userService: UserService
    let userServiceClient: UserServiceClient
    let documentsService: DocumentsService
    let documentsDrfoProvider: DocumentsDrfoProvider
    let documentsExpirationService: DocumentsExpirationService

    beforeAll(async () => {
        app = await getApp()

        getDocumentsAction = app.container.build(GetDocumentsAction)
        external = app.container.resolve('external')
        userService = app.container.resolve<UserService>('userService')
        userServiceClient = app.container.resolve<UserServiceClient>('userServiceClient')
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

            const getUserDocumentSettingsSpy = jest.spyOn(userServiceClient, 'getUserDocumentSettings').mockResolvedValue({
                documentOrderSettings: Object.values(PassportDocumentType).map((documentType) => ({
                    documentType,
                    documentIdentifiers: [],
                })),
                documentVisibilitySettings: [],
            })

            jest.spyOn(userService, 'checkDocumentsFeaturePoints').mockResolvedValue({ documents: [] })

            // Act
            const result = await getDocumentsAction.handler({
                ...actionArgs,
                params: { filter: [PassportDocumentType.ForeignPassport, PassportDocumentType.InternalPassport] },
            })

            // Assert
            expect(taxpayerCardSpy).toHaveBeenCalledTimes(1)
            expect(getUserDocumentSettingsSpy).toHaveBeenCalledTimes(1)
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
                                                accessibilityDescription: PassportDocumentTypeCamelCase.IdCard,
                                                action: {
                                                    type: IconAtmActionType.ellipseMenu,
                                                    subtype: PassportDocumentTypeCamelCase.IdCard,
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
                                        componentId: expect.any(String),
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
                                {
                                    verificationCodesOrg: {},
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
                                                accessibilityDescription: PassportDocumentTypeCamelCase.ForeignPassport,
                                                action: {
                                                    type: IconAtmActionType.ellipseMenu,
                                                    subtype: PassportDocumentTypeCamelCase.ForeignPassport,
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
                                                accessibilityDescription: PassportDocumentTypeCamelCase.ForeignPassport,
                                                action: {
                                                    type: IconAtmActionType.ellipseMenu,
                                                    subtype: PassportDocumentTypeCamelCase.ForeignPassport,
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
                                        componentId: expect.any(String),
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
                                {
                                    verificationCodesOrg: {},
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
    })

    it('should not return document that is not expired', async () => {
        // Arrange
        const actionArgs = testKit.session.getUserActionArguments({}, {}, { validItn: true })
        const filter = [PassportDocumentType.InternalPassport]
        const userDocumentsOrder: DocumentOrderSettingsItem[] = [
            { documentType: PassportDocumentType.InternalPassport, documentIdentifiers: [] },
        ]

        jest.spyOn(userService, 'checkDocumentsFeaturePoints').mockResolvedValueOnce({ documents: [] })
        jest.spyOn(userServiceClient, 'getUserDocumentSettings').mockResolvedValueOnce({
            documentOrderSettings: userDocumentsOrder,
            documentVisibilitySettings: [],
        })
        jest.spyOn(userService, 'getDecryptedDataFromStorage').mockResolvedValue({
            [PassportDocumentType.InternalPassport]: [{ id: 'unique-doc-number' }],
        })
        jest.spyOn(documentsExpirationService, 'checkDocumentExpiration').mockReturnValueOnce({
            currentDate: new Date().toISOString(),
            expirationDate: new Date().toISOString(),
        })

        // Act
        const result = await getDocumentsAction.handler({ ...actionArgs, params: { filter } })

        // Assert
        expect(result).toEqual<ActionResult>({
            [documentsService.documentTypeToDocumentTypeResponse[PassportDocumentType.InternalPassport]!]: {
                status: HttpStatusCode.FORBIDDEN,
                data: [],
                currentDate: expect.any(String),
                expirationDate: expect.any(String),
            },
            documentsTypeOrder: [PassportDocumentTypeCamelCase.IdCard],
        })
    })
})
