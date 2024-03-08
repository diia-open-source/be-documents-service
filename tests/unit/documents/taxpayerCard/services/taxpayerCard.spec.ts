import Logger from '@diia-inhouse/diia-logger'
import { AccessDeniedError, BadRequestError, DocumentNotFoundError, InternalServerError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import {
    ActionCode,
    DocStatus,
    DocumentInstance,
    DocumentType,
    ForeignPassportInstanceDetails,
    IconAtmActionType,
    Localization,
    OwnerType,
    TaxpayerCard,
    TickerAtm,
    TickerAtmType,
    TickerAtmUsage,
} from '@diia-inhouse/types'

import TaxpayerCardDataMapper from '@src/documents/taxpayerCard/dataMappers/document'
import { GetTaxpayerCardResponse } from '@src/documents/taxpayerCard/interfaces/services/taxpayer'
import DocumentsDrfoServiceProvider from '@src/documents/taxpayerCard/providers/drfo'
import TaxpayerCardService from '@src/documents/taxpayerCard/services/document'

import UserService from '@services/user'

import { GetDocumentsResult } from '@interfaces/services/documents'
import { AssertStrategyParams, VerifyOtpResponse } from '@interfaces/services/documentVerification'

describe('TaxpayerCardService', () => {
    const testKit = new TestKit()
    const documentsDrfoServiceProviderMock = mockInstance(DocumentsDrfoServiceProvider)
    const taxPayerCardDataMapperMock = mockInstance(TaxpayerCardDataMapper)
    const userServiceMock = mockInstance(UserService)
    const logger = mockInstance(Logger)
    const taxpayerCardService = new TaxpayerCardService(
        documentsDrfoServiceProviderMock,
        taxPayerCardDataMapperMock,
        userServiceMock,
        logger,
    )
    const { user } = testKit.session.getUserSession()
    const { identifier: userIdentifier } = user
    const { id, docNumber, lastNameUA, firstNameUA, middleNameUA, birthday, creationDate, docStatus } = testKit.docs.getTaxpayerCard()
    const taxpayerCardDto = {
        card: {
            isVisible: true,
            id,
            docNumber,
            lastNameUA,
            firstNameUA,
            middleNameUA,
            birthday,
            creationDate,
            docStatus,
        },
        expirationTime: 180000,
    }

    describe('method assertDocumentIsValid', () => {
        const assertStrategyParams = <AssertStrategyParams>{
            documentId: id,
            documentType: DocumentType.TaxpayerCard,
            ownerType: OwnerType.owner,
            documentAssertParams: {
                user,
            },
        }

        it('should successfully assert if document is valid', async () => {
            jest.spyOn(documentsDrfoServiceProviderMock, 'getTaxpayerCard').mockResolvedValueOnce(taxpayerCardDto)

            await taxpayerCardService.assertDocumentIsValid(assertStrategyParams)

            expect(documentsDrfoServiceProviderMock.getTaxpayerCard).toHaveBeenCalledWith(user)
        })

        it.each([
            [
                'taxpayer card not found',
                assertStrategyParams,
                <GetTaxpayerCardResponse>(<unknown>{ card: undefined }),
                new AccessDeniedError(),
            ],
            [
                'there is no taxpayer card with requested id',
                { ...assertStrategyParams, documentId: 'wrong-document-id' },
                taxpayerCardDto,
                new DocumentNotFoundError('There is no taxpayer card with id wrong-document-id'),
            ],
        ])('should fail with error in case %s', async (_msg, params, dto, expectedError) => {
            jest.spyOn(documentsDrfoServiceProviderMock, 'getTaxpayerCard').mockResolvedValueOnce(dto)

            await expect(async () => {
                await taxpayerCardService.assertDocumentIsValid(params)
            }).rejects.toEqual(expectedError)

            expect(documentsDrfoServiceProviderMock.getTaxpayerCard).toHaveBeenCalledWith(user)
        })
    })

    describe('method checkForValidTaxpayerCard', () => {
        it('should successfully pass taxpayer card verification', async () => {
            jest.spyOn(userServiceMock, 'hasOneOfDocuments').mockResolvedValueOnce(true)

            await taxpayerCardService.checkForValidTaxpayerCard(userIdentifier)

            expect(userServiceMock.hasOneOfDocuments).toHaveBeenCalledWith(userIdentifier, [DocumentType.TaxpayerCard])
        })

        it('should fail with error in case user does not have taxpayer card', async () => {
            const processCode = 100500

            jest.spyOn(userServiceMock, 'hasOneOfDocuments').mockResolvedValueOnce(false)

            await expect(async () => {
                await taxpayerCardService.checkForValidTaxpayerCard(userIdentifier, processCode)
            }).rejects.toEqual(new BadRequestError('Not verified taxpayer card', {}, processCode))

            expect(userServiceMock.hasOneOfDocuments).toHaveBeenCalledWith(userIdentifier, [DocumentType.TaxpayerCard])
        })
    })

    describe('method getDocuments', () => {
        const getDocumentsParams = {
            user,
            documentType: DocumentType.TaxpayerCard,
            itn: user.itn,
            designSystem: true,
            context: {},
        }

        it('should successfully get documents list', async () => {
            const { card, expirationTime } = taxpayerCardDto
            const docName = 'Картка платника податків'
            const fullNameUa = `${lastNameUA} ${firstNameUA} ${middleNameUA}`
            const tickerAtm = <TickerAtm>{
                type: TickerAtmType.positive,
                usage: TickerAtmUsage.document,
                value: 'value',
            }
            const expectedTaxpayerCardInstance = <DocumentInstance>{
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
                                    value: docName,
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
                            tableBlockPlaneOrg: [
                                {
                                    tableSecondaryHeadingMlc: {
                                        label: fullNameUa,
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
                            ],
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
                                ellipseMenu: true,
                            },
                        },
                    ],
                    EN: [],
                },
                fullInfo: [],
                content: [],
            }

            jest.spyOn(documentsDrfoServiceProviderMock, 'getTaxpayerCard').mockResolvedValueOnce(taxpayerCardDto)
            jest.spyOn(taxPayerCardDataMapperMock, 'toDocumentInstance').mockReturnValueOnce(expectedTaxpayerCardInstance)

            const result = await taxpayerCardService.getDocuments(getDocumentsParams)

            expect(result).toEqual<GetDocumentsResult<TaxpayerCard>>({
                documents: [card],
                designSystemDocuments: [expectedTaxpayerCardInstance],
                customExpirationTime: expirationTime,
            })

            expect(documentsDrfoServiceProviderMock.getTaxpayerCard).toHaveBeenCalledWith(user)
            expect(taxPayerCardDataMapperMock.toDocumentInstance).toHaveBeenCalledWith(card)
        })

        it('should fail with error in case user is not provided', async () => {
            await expect(async () => {
                await taxpayerCardService.getDocuments({ ...getDocumentsParams, user: undefined })
            }).rejects.toEqual(new InternalServerError('User must be provided'))
        })
    })

    describe('method getValidTaxpayerCard', () => {
        it.each([
            ['should successfully get valid taxpayer card', taxpayerCardDto, taxpayerCardDto.card],
            [
                'should return undefined in case doc status is not ok',
                { card: { ...taxpayerCardDto.card, docStatus: DocStatus.Confirming } },
                undefined,
            ],
        ])('%s', async (_msg, dto, expectedResult) => {
            jest.spyOn(documentsDrfoServiceProviderMock, 'getTaxpayerCard').mockResolvedValueOnce(dto)

            expect(await taxpayerCardService.getValidTaxpayerCard(user)).toEqual(expectedResult)

            expect(documentsDrfoServiceProviderMock.getTaxpayerCard).toHaveBeenCalledWith(user)
        })
    })

    describe('method getTaxpayerCardTableOrg', () => {
        it('should successfully return taxpayer card TableOrg', async () => {
            const { itn } = user
            const expectedResult = {
                items: [],
            }

            jest.spyOn(documentsDrfoServiceProviderMock, 'getTaxpayerCard').mockResolvedValueOnce(taxpayerCardDto)
            jest.spyOn(taxPayerCardDataMapperMock, 'toVerifyDesignBlock').mockReturnValueOnce(expectedResult)

            expect(await taxpayerCardService.getTaxpayerCardTableOrg(user)).toEqual(expectedResult)

            expect(documentsDrfoServiceProviderMock.getTaxpayerCard).toHaveBeenCalledWith(user)
            expect(taxPayerCardDataMapperMock.toVerifyDesignBlock).toHaveBeenCalledWith(docStatus, itn, creationDate)
        })
    })

    describe('method enrichDocumentWithTaxpayerCard', () => {
        it('should successfully identity document with taxpayer card', () => {
            const { card } = taxpayerCardDto
            const idCard = testKit.docs.getInternalPassport()
            const taxpayerUa = {
                name: 'РНОКПП (ІПН)',
                status: docStatus,
                value: docNumber,
                statusDescription: `Пройшов перевірку Державною податковою службою ${creationDate}`,
            }
            const taxpayerEng = {
                name: 'Individual Tax Number:',
                status: docStatus,
                value: docNumber,
                statusDescription: `Verified by State Tax Service on ${creationDate}`,
            }

            const expectedResult = {
                ...idCard,
                taxpayerCard: {
                    status: docStatus,
                    number: docNumber,
                    creationDate,
                },
                [Localization.UA]: {
                    taxpayer: taxpayerUa,
                },
                [Localization.ENG]: {
                    taxpayer: taxpayerEng,
                },
            }

            jest.spyOn(taxPayerCardDataMapperMock, 'toEntityInDocument').mockReturnValueOnce(taxpayerUa)
            jest.spyOn(taxPayerCardDataMapperMock, 'toEntityInDocument').mockReturnValueOnce(taxpayerEng)

            expect(
                taxpayerCardService.enrichDocumentWithTaxpayerCard(
                    {
                        ...idCard,
                        [Localization.UA]: <ForeignPassportInstanceDetails>{},
                        [Localization.ENG]: <ForeignPassportInstanceDetails>{},
                    },
                    card,
                ),
            ).toEqual(expectedResult)

            expect(taxPayerCardDataMapperMock.toEntityInDocument).toHaveBeenCalledWith(docStatus, docNumber, creationDate, Localization.UA)
            expect(taxPayerCardDataMapperMock.toEntityInDocument).toHaveBeenCalledWith(docStatus, docNumber, creationDate, Localization.ENG)
        })
    })

    describe('method verifyDocument', () => {
        const verifyOtpResponse = {
            requestor: user,
            docId: id,
        }

        it('should successfully verify document', async () => {
            const { card: expectedResult } = taxpayerCardDto

            jest.spyOn(documentsDrfoServiceProviderMock, 'getTaxpayerCard').mockResolvedValueOnce(taxpayerCardDto)

            expect(await taxpayerCardService.verifyDocument(<VerifyOtpResponse>verifyOtpResponse)).toEqual(expectedResult)

            expect(documentsDrfoServiceProviderMock.getTaxpayerCard).toHaveBeenCalledWith(user)
        })

        it('should fail with error in case requested doc id is not equal to available', async () => {
            const docId = 'wrong-doc-id'

            jest.spyOn(documentsDrfoServiceProviderMock, 'getTaxpayerCard').mockResolvedValueOnce(taxpayerCardDto)

            await expect(async () => {
                await taxpayerCardService.verifyDocument(<VerifyOtpResponse>{ ...verifyOtpResponse, docId })
            }).rejects.toEqual(new DocumentNotFoundError(`There is no taxpayer card with docId ${docId}`))

            expect(documentsDrfoServiceProviderMock.getTaxpayerCard).toHaveBeenCalledWith(user)
        })
    })
})
