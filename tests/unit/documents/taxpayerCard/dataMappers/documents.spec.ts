import moment from 'moment'

import DiiaLogger from '@diia-inhouse/diia-logger'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import {
    ActionCode,
    DocStatus,
    DocumentInstance,
    DocumentType,
    DocumentTypeCamelCase,
    Icon,
    IconAtmActionType,
    Localization,
    TickerAtmType,
    TickerAtmUsage,
} from '@diia-inhouse/types'

import TaxpayerCardDataMapper from '@src/documents/taxpayerCard/dataMappers/document'

import DocumentAttributesService from '@services/documentAttributes'

import DesignSystemDataMapper from '@dataMappers/designSystemDataMapper'

import { RnokppErrorCode } from '@interfaces/providers/drfo'
import { DocumentTickerCode, DocumentTickerPlaceholder } from '@interfaces/services/documentAttributes'

describe('documents', () => {
    const testKit = new TestKit()
    const loggerMock = mockInstance(DiiaLogger)
    const designSystemDataMapperMock = mockInstance(DesignSystemDataMapper)
    const documentAttributesServiceMock = mockInstance(DocumentAttributesService)
    const taxPayerCardDataMapper = new TaxpayerCardDataMapper(loggerMock, designSystemDataMapperMock, documentAttributesServiceMock)
    const today = moment().format('DD.MM.YYYY')
    const { user } = testKit.session.getUserSession()
    const taxpayerCard = testKit.docs.getTaxpayerCard()
    const { docNumber, id, birthday } = taxpayerCard
    const docName = 'Картка платника податків'
    const tickerAtm = {
        usage: TickerAtmUsage.document,
        type: TickerAtmType.positive,
        value: expect.any(String),
    }
    const fullNameUa = 'Дія Надія Володимирівна'
    const docNameWithSeparator = 'Картка платника\nподатків'
    const fullNameUaWithSeparator = 'Дія\nНадія\nВолодимирівна'

    describe('method toEntity', () => {
        it.each([
            [
                'no rnokpp error code',
                user,
                undefined,
                {
                    docStatus: DocStatus.Confirming,
                    isVisible: true,
                    id: user.identifier,
                    docNumber: user.itn,
                    lastNameUA: user.lName,
                    firstNameUA: user.fName,
                    middleNameUA: user.mName,
                    birthday: user.birthDay,
                    creationDate: today,
                    tickerOptions: undefined,
                },
                (): void => {},
                (): void => {},
            ],
            [
                'rnokpp error code is ok',
                user,
                RnokppErrorCode.Ok,
                {
                    docStatus: DocStatus.Ok,
                    isVisible: true,
                    id: user.identifier,
                    docNumber: user.itn,
                    lastNameUA: user.lName,
                    firstNameUA: user.fName,
                    middleNameUA: user.mName,
                    birthday: user.birthDay,
                    creationDate: today,
                    tickerOptions: {
                        text: 'text',
                        type: 'info',
                    },
                },
                (): void => {
                    jest.spyOn(documentAttributesServiceMock, 'getTickerV1').mockReturnValueOnce({
                        text: 'text',
                        type: 'info',
                    })
                },
                (): void => {
                    expect(documentAttributesServiceMock.getTickerV1).toHaveBeenCalledWith(
                        DocumentType.TaxpayerCard,
                        DocumentTickerCode.Valid,
                    )
                },
            ],
            [
                'rnokpp error code is unhandled',
                user,
                <RnokppErrorCode>'unhandled',
                {
                    docStatus: DocStatus.NotConfirmed,
                    isVisible: true,
                    id: user.identifier,
                    docNumber: user.itn,
                    lastNameUA: user.lName,
                    firstNameUA: user.fName,
                    middleNameUA: user.mName,
                    birthday: user.birthDay,
                    creationDate: today,
                    tickerOptions: undefined,
                },
                (): void => {},
                (): void => {},
            ],
        ])(
            'should successfully convert user data to tax payer card when %s',
            (_msg, inputUser, errorCode, expectedResult, defineSpies, checkExpectations) => {
                defineSpies()

                const result = taxPayerCardDataMapper.toEntity(inputUser, errorCode)

                expect(result).toEqual(expectedResult)

                checkExpectations()
            },
        )
    })

    describe('method toEntityInDocument', () => {
        it.each([
            [
                'doc status is Ok',
                DocStatus.Ok,
                user.itn,
                today,
                Localization.UA,
                {
                    name: 'РНОКПП (ІПН)',
                    value: user.itn,
                    status: DocStatus.Ok,
                    statusDescription: `Пройшов перевірку Державною податковою службою ${today}`,
                },
                (): void => {},
            ],
            [
                'doc status is Ok and localization is ENG',
                DocStatus.Ok,
                user.itn,
                today,
                Localization.ENG,
                {
                    name: 'Individual Tax Number:',
                    value: user.itn,
                    status: DocStatus.Ok,
                    statusDescription: `Verified by State Tax Service on ${today}`,
                },
                (): void => {},
            ],
            [
                'doc status is Confirming',
                DocStatus.Confirming,
                user.itn,
                today,
                Localization.UA,
                {
                    name: 'РНОКПП (ІПН)',
                    value: 'ХХХХХХХХХХ',
                    status: DocStatus.Confirming,
                    statusDescription: 'Перевіряється Державною податковою службою',
                },
                (): void => {},
            ],
            [
                'doc status is Inactive and there is no description for provided status',
                DocStatus.Inactive,
                user.itn,
                today,
                Localization.UA,
                {
                    name: 'РНОКПП (ІПН)',
                    value: 'ХХХХХХХХХХ',
                    status: DocStatus.Inactive,
                    statusDescription: '',
                },
                (): void => {
                    expect(loggerMock.error).toHaveBeenCalledWith('Unexpected localization or docStatus', {
                        localization: Localization.UA,
                        docStatus: DocStatus.Inactive,
                    })
                },
            ],
        ])(
            'should successfully convert input data into tax payer card in document in case %s',
            (_msg, docStatus, number, creationDate, localization, expectedResult, checkExpectations) => {
                const result = taxPayerCardDataMapper.toEntityInDocument(docStatus, number, creationDate, localization)

                expect(result).toEqual(expectedResult)
                checkExpectations()
            },
        )
    })

    describe('method toVerifyDesignBlock', () => {
        it.each([
            [
                DocStatus.Ok,
                user.itn,
                {
                    items: [
                        {
                            tableItemHorizontalMlc: {
                                label: 'РНОКПП (ІПН):',
                                secondaryLabel: 'Individual Tax Number',
                                value: user.itn,
                                icon: {
                                    code: 'copy',
                                    action: {
                                        type: 'copy',
                                    },
                                },
                            },
                        },
                        {
                            tableItemVerticalMlc: {
                                value: `Пройшов перевірку Державною податковою службою ${today}`,
                                secondaryValue: `Verified by State Tax Service on ${today}`,
                                valueIcons: [],
                                valueImages: [],
                            },
                        },
                    ],
                },
            ],
            [
                DocStatus.Confirming,
                'ХХХХХХХХХХ',
                {
                    items: [
                        {
                            tableItemHorizontalMlc: {
                                label: 'РНОКПП (ІПН):',
                                secondaryLabel: 'Individual Tax Number',
                                value: 'ХХХХХХХХХХ',
                                icon: {
                                    code: 'copy',
                                    action: {
                                        type: 'copy',
                                    },
                                },
                            },
                        },
                        {
                            tableItemVerticalMlc: {
                                value: 'Перевіряється Державною податковою службою',
                                secondaryValue: 'Verifiсation by State Tax Service is in progress',
                                valueIcons: [],
                                valueImages: [],
                            },
                        },
                    ],
                },
            ],
        ])('should return verify design block for status %s', (docStatus, expectedValue, expectedResult) => {
            jest.spyOn(designSystemDataMapperMock, 'getTableItemHorizontalWithCopyAction').mockReturnValueOnce({
                label: 'РНОКПП (ІПН):',
                secondaryLabel: 'Individual Tax Number',
                value: expectedValue,
                icon: {
                    code: ActionCode.copy,
                    action: {
                        type: IconAtmActionType.copy,
                    },
                },
            })

            const result = taxPayerCardDataMapper.toVerifyDesignBlock(docStatus, user.itn, today)

            expect(result).toEqual(expectedResult)

            expect(designSystemDataMapperMock.getTableItemHorizontalWithCopyAction).toHaveBeenCalledWith(
                expectedValue,
                'РНОКПП (ІПН):',
                'Individual Tax Number',
            )
        })
    })

    describe('method toDocumentInstance', () => {
        it('should successfully convert taxpayer card to document instance', () => {
            const { docStatus, creationDate } = taxpayerCard
            const updatedAt = moment().format('DD.MM.YYYY')

            jest.spyOn(documentAttributesServiceMock, 'getUpdatedAtValue').mockReturnValueOnce(updatedAt)
            jest.spyOn(documentAttributesServiceMock, 'getTicker').mockReturnValueOnce(tickerAtm)

            expect(taxPayerCardDataMapper.toDocumentInstance(taxpayerCard)).toEqual({
                docStatus,
                id,
                docNumber,
                docData: {
                    docName,
                    birthday,
                    rnokpp: docNumber,
                    fullName: fullNameUa,
                },
                dataForDisplayingInOrderConfigurations: {
                    iconRight: { code: ActionCode.drag },
                    label: docNumber,
                    description: `Пройшов перевірку Державною податковою службою ${creationDate}`,
                },
                frontCard: {
                    UA: [
                        {
                            docHeadingOrg: {
                                headingWithSubtitlesMlc: {
                                    value: docNameWithSeparator,
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
                                    label: fullNameUaWithSeparator,
                                },
                                items: [
                                    {
                                        tableItemVerticalMlc: {
                                            label: 'Дата народження:',
                                            value: birthday,
                                            valueIcons: [],
                                            valueImages: [],
                                        },
                                    },
                                ],
                            },
                        },
                        { tickerAtm },
                        {
                            docButtonHeadingOrg: {
                                docNumberCopyMlc: {
                                    value: docNumber,
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
                content: [],
                fullInfo: [],
            })

            expect(documentAttributesServiceMock.getUpdatedAtValue).toHaveBeenCalledWith()
            expect(documentAttributesServiceMock.getTicker).toHaveBeenCalledWith({
                code: DocumentTickerCode.Valid,
                templateParams: {
                    [DocumentTickerPlaceholder.UpdatedAt]: updatedAt,
                },
                documentType: DocumentType.TaxpayerCard,
            })
        })
    })

    describe('method toVerifyDocumentInstance', () => {
        it('should successfully verify document instance', () => {
            const { docStatus } = taxpayerCard

            jest.spyOn(documentAttributesServiceMock, 'getTicker').mockReturnValueOnce(tickerAtm)

            expect(taxPayerCardDataMapper.toVerifyDocumentInstance(taxpayerCard)).toEqual<DocumentInstance>({
                docStatus,
                id,
                docNumber,
                docData: {
                    docName: docName,
                    birthday,
                    rnokpp: docNumber,
                    fullName: fullNameUa,
                },
                frontCard: {
                    UA: [
                        {
                            docHeadingOrg: {
                                headingWithSubtitlesMlc: { value: docNameWithSeparator, subtitles: [] },
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
                                    label: fullNameUaWithSeparator,
                                },
                                items: [
                                    {
                                        tableItemVerticalMlc: {
                                            label: 'Дата народження:',
                                            value: birthday,
                                            valueIcons: [],
                                            valueImages: [],
                                        },
                                    },
                                ],
                            },
                        },
                        { tickerAtm },
                        {
                            docButtonHeadingOrg: {
                                docNumberCopyMlc: {
                                    value: docNumber,
                                },
                            },
                        },
                    ],
                    EN: [],
                },
                content: [],
                fullInfo: [],
            })

            expect(documentAttributesServiceMock.getTicker).toHaveBeenCalledWith({
                code: DocumentTickerCode.Valid,
            })
        })
    })
})
