import { randomUUID as uuid } from 'node:crypto'

import TestKit from '@diia-inhouse/test'
import { ActionCode, DocStatus, HttpStatusCode, Icon, IconAtmActionType, TickerAtmType, TickerAtmUsage } from '@diia-inhouse/types'
import { UserServiceClient } from '@diia-inhouse/user-service-client'

import { DocumentType, DocumentTypeCamelCase, TaxpayerCard } from '@src/documents/taxpayerCard/interfaces/services'
import DocumentsDrfoProvider from '@src/documents/taxpayerCard/providers/drfo/index'

import GetDocumentsAction from '@actions/v6/getDocuments'

import DocumentsService from '@services/documents'
import UserService from '@services/user'

import documentsExpirationModel from '@models/documentsExpiration'

import { getApp } from '@tests/utils/getApp'

import { ActionResult } from '@interfaces/actions/v6/getDocuments'
import { DocumentIdsExpiration, DocumentsExpirationModel } from '@interfaces/models/documentsExpiration'

describe(`Action ${GetDocumentsAction.name}`, () => {
    const testKit = new TestKit()

    let app: Awaited<ReturnType<typeof getApp>>
    let getDocumentsAction: GetDocumentsAction
    let userService: UserService
    let userServiceClient: UserServiceClient
    let documentsService: DocumentsService
    let documentsDrfoProvider: DocumentsDrfoProvider

    beforeAll(async () => {
        app = await getApp()

        getDocumentsAction = app.container.build(GetDocumentsAction)
        userService = app.container.resolve<UserService>('userService')
        userServiceClient = app.container.resolve<UserServiceClient>('userServiceClient')
        documentsService = app.container.resolve<DocumentsService>('documentsService')
        documentsDrfoProvider = app.container.resolve<DocumentsDrfoProvider>('documentsDrfoProvider')

        await app.start()
    })

    afterAll(async () => {
        await app.stop()
    })

    describe('should return documents by design system', () => {
        it(`should return taxpayer card`, async () => {
            // Arrange
            const actionArgs = testKit.session.getUserActionArguments({}, {}, { validItn: true })
            const taxpayerCardMock = <TaxpayerCard>testKit.docs.generateDocument(DocumentType.TaxpayerCard)
            const taxpayerCardSpy = jest.spyOn(documentsDrfoProvider, 'getTaxpayerCard').mockResolvedValue({
                card: taxpayerCardMock,
            })

            const getUserDocumentSettingsSpy = jest.spyOn(userServiceClient, 'getUserDocumentSettings').mockResolvedValueOnce({
                documentOrderSettings: Object.values(DocumentType).map((documentType) => ({
                    documentType,
                    documentIdentifiers: [],
                })),
                documentVisibilitySettings: [],
            })

            jest.spyOn(userService, 'checkDocumentsFeaturePoints').mockResolvedValue({ documents: [] })

            // Act
            const result = await getDocumentsAction.handler({
                ...actionArgs,
                params: { filter: [DocumentType.TaxpayerCard] },
            })

            // Assert
            expect(taxpayerCardSpy).toHaveBeenCalledTimes(2)
            expect(getUserDocumentSettingsSpy).toHaveBeenCalledTimes(1)
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
                                            componentId: expect.any(String),
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
                                                accessibilityDescription: DocumentTypeCamelCase.TaxpayerCard,
                                                action: {
                                                    type: IconAtmActionType.ellipseMenu,
                                                    subtype: DocumentTypeCamelCase.TaxpayerCard,
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

    it('should return taxpayer card with updated expiration when exist in db with 50+ years of expiration', async () => {
        // Arrange
        const actionArgs = testKit.session.getUserActionArguments({}, {}, { validItn: true })

        const {
            session: {
                user: { identifier: userIdentifier },
            },
            headers: { mobileUid },
        } = actionArgs

        const invalidExpiration = new Date('2900-01-01')
        const { _id: expirationModelId } = await documentsExpirationModel.create({
            mobileUid,
            userIdentifier,
            [DocumentType.TaxpayerCard]: {
                date: invalidExpiration,
            },
        })

        jest.spyOn(userService, 'checkDocumentsFeaturePoints').mockResolvedValueOnce({ documents: [] })
        jest.spyOn(userServiceClient, 'getUserDocumentSettings').mockResolvedValueOnce({
            documentOrderSettings: [{ documentType: DocumentType.TaxpayerCard, documentIdentifiers: [] }],
            documentVisibilitySettings: [],
        })
        jest.spyOn(userService, 'getDecryptedDataFromStorage').mockResolvedValue({
            [DocumentType.TaxpayerCard]: [{ id: uuid() }],
        })

        // Act
        const result = await getDocumentsAction.handler({ ...actionArgs, params: { filter: [] } })

        // Assert
        const expirationModel = <DocumentsExpirationModel>await documentsExpirationModel.findByIdAndDelete(expirationModelId).lean()
        const newExpiration = (<DocumentIdsExpiration>expirationModel?.[DocumentType.TaxpayerCard])?.date

        expect(newExpiration?.getTime()).toBeLessThan(invalidExpiration.getTime())
        expect(result).toEqual<ActionResult>({
            [documentsService.documentTypeToDocumentTypeResponse[DocumentType.TaxpayerCard]!]: {
                status: HttpStatusCode.OK,
                data: expect.any(Array),
                currentDate: expect.any(String),
                expirationDate: expect.any(String),
            },
            documentsTypeOrder: expect.any(Array),
        })
    })
})
