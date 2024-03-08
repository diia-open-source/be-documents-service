const mockUtils = {
    handleError: (error: Error, callback: CallableFunction): Promise<void> => callback(error),
}

jest.mock('@diia-inhouse/utils', () => ({
    utils: mockUtils,
}))

import { randomUUID } from 'crypto'

import { merge } from 'lodash'
import moment from 'moment'
import { mongo } from 'mongoose'

import { AnalyticsService } from '@diia-inhouse/analytics'
import DiiaLogger from '@diia-inhouse/diia-logger'
import { Task } from '@diia-inhouse/diia-queue'
import {
    AccessDeniedError,
    ApiError,
    DocumentNotFoundError,
    ExternalCommunicatorError,
    InternalServerError,
    NotFoundError,
} from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import {
    AppUser,
    DocStatus,
    DocumentType,
    HttpStatusCode,
    OwnerType,
    PassportGenderEN,
    PassportType,
    TableBlockOrg,
} from '@diia-inhouse/types'

import TaxpayerCardService from '@src/documents/taxpayerCard/services/document'

import AddressService from '@services/address'
import PassportService from '@services/passport'

import DocumentsDmsProvider from '@providers/dms/documentsDms'
import DocumentsEisProvider from '@providers/eis/documentsEis'

import PassportDataMapper from '@dataMappers/passportDataMapper'

import Utils from '@utils/index'

import { getDocumentInstance } from '@tests/mocks/stubs/documentInstance'

import { RegistryPassportDTO } from '@interfaces/dto'
import { PassportByInn, PassportByInnRequester } from '@interfaces/providers/dms'
import { ForeignPassportInstance, InternalPassportInstance } from '@interfaces/providers/eis'
import { RegistrationAddress } from '@interfaces/providers/usdr'
import { AnalyticsActionResult as ServiceAnalyticsActionResult, AnalyticsCategory as ServiceAnalyticsCategory } from '@interfaces/services'
import { GetDocumentsParams, GetDocumentsResult } from '@interfaces/services/documents'
import { AssertStrategyParams } from '@interfaces/services/documentVerification'

const addressServiceMock = mockInstance(AddressService)
const taxpayerCardServiceMock = mockInstance(TaxpayerCardService)
const documentsEisProviderMock = mockInstance(DocumentsEisProvider)
const documentsDmsProviderMock = mockInstance(DocumentsDmsProvider)
const passportDataMapperMock = mockInstance(PassportDataMapper)
const appUtilsMock = mockInstance(Utils)
const analyticsMock = mockInstance(AnalyticsService)
const taskMock = mockInstance(Task)
const loggerMock = mockInstance(DiiaLogger)

const passportService = new PassportService(
    addressServiceMock,
    taxpayerCardServiceMock,
    documentsEisProviderMock,
    documentsDmsProviderMock,
    passportDataMapperMock,
    appUtilsMock,
    analyticsMock,
    taskMock,
    loggerMock,
)

const testKit = new TestKit()
const { user } = testKit.session.getUserSession()
const { user: portalUser } = testKit.session.getPortalUserSession()
const foreignPassport = testKit.docs.getForeignPassport()
const internalPassport = testKit.docs.getInternalPassport()

const registryPassportInstance = {
    type: PassportType.ID,
    number: '100',
    date_issue: '',
    date_expiry: '',
    dep_issue: '',
    last_name: 'last_name',
    last_name_en: 'last_name_en',
    first_name: 'first_name',
    first_name_en: 'first_name_en',
    middle_name: 'middle_name',
    middle_name_en: 'middle_name_en',
    birth_place: 'birth_place',
    photo: 'photo',
    signature: 'signature',
}

const registryPassportDTO: RegistryPassportDTO = {
    unzr: 'unzr',
    rnokpp: 'rnokpp',
    gender: PassportGenderEN.M,
    date_birth: '',
    registration: '',
    documents: [registryPassportInstance],
}

const tableBlockOrg: TableBlockOrg = {
    items: [],
}

const internalPassportInstance: InternalPassportInstance = testKit.docs.getInternalPassport()
const foreignPassportInstance: ForeignPassportInstance = testKit.docs.getForeignPassport()

describe('Service: PassportService', () => {
    afterEach(() => {
        jest.restoreAllMocks()
    })

    describe('method: `assertDocumentIsValid`', () => {
        it('should throw AccessDeniedError if no documents', async () => {
            await expect(
                passportService.assertDocumentIsValid(<AssertStrategyParams>{
                    documentType: DocumentType.InternalPassport,
                    ownerType: OwnerType.owner,
                    documentId: randomUUID(),
                    documentAssertParams: {
                        user,
                    },
                }),
            ).rejects.toBeInstanceOf(AccessDeniedError)
        })

        it('should throw DocumentNotFoundError if documents has incorrectType', async () => {
            jest.spyOn(documentsEisProviderMock, 'getPassports').mockResolvedValueOnce(registryPassportDTO)
            jest.spyOn(passportDataMapperMock, 'toDocumentInstanceV1').mockReturnValueOnce([internalPassport])

            await expect(
                passportService.assertDocumentIsValid(<AssertStrategyParams>{
                    documentType: DocumentType.InternalPassport,
                    ownerType: OwnerType.owner,
                    documentId: randomUUID(),
                    documentAssertParams: {
                        user,
                        passportType: PassportType.P,
                    },
                }),
            ).rejects.toBeInstanceOf(DocumentNotFoundError)
        })

        it('should throw DocumentNotFoundError if documents has incorrectId', async () => {
            jest.spyOn(documentsEisProviderMock, 'getPassports').mockResolvedValueOnce(registryPassportDTO)
            jest.spyOn(passportDataMapperMock, 'toDocumentInstanceV1').mockReturnValueOnce([internalPassport])

            await expect(
                passportService.assertDocumentIsValid(<AssertStrategyParams>{
                    documentType: DocumentType.InternalPassport,
                    ownerType: OwnerType.owner,
                    documentId: 'fakeId',
                    documentAssertParams: {
                        user,
                        passportType: PassportType.ID,
                    },
                }),
            ).rejects.toBeInstanceOf(DocumentNotFoundError)
        })

        it('should successfully resolve', async () => {
            jest.spyOn(documentsEisProviderMock, 'getPassports').mockResolvedValueOnce(registryPassportDTO)
            jest.spyOn(passportDataMapperMock, 'toDocumentInstanceV1').mockReturnValueOnce([internalPassport])

            await expect(
                passportService.assertDocumentIsValid(<AssertStrategyParams>{
                    documentType: DocumentType.InternalPassport,
                    ownerType: OwnerType.owner,
                    documentId: internalPassport.id,
                    documentAssertParams: {
                        user,
                        passportType: PassportType.ID,
                    },
                }),
            ).resolves.toBeUndefined()
        })
    })

    describe('method: `getInternalPassportDocuments`', () => {
        const documentType = DocumentType.InternalPassport
        const itn = 'fake'

        it('should throw InternalServerError for request without user parameter', async () => {
            await expect(passportService.getInternalPassportDocuments(<GetDocumentsParams>{})).rejects.toBeInstanceOf(InternalServerError)
        })

        it('should throw DocumentNotFoundError when getPassports return undefined', async () => {
            jest.spyOn(documentsEisProviderMock, 'getPassports').mockResolvedValueOnce(<RegistryPassportDTO>(<unknown>Promise.resolve()))

            await expect(
                passportService.getInternalPassportDocuments({
                    documentType,
                    itn,
                    designSystem: true,
                    user: user,
                    context: {
                        promisedPassports: undefined,
                    },
                }),
            ).rejects.toBeInstanceOf(DocumentNotFoundError)
        })

        it('should throw InternalServerError when promisedTaxpayerCardTableOrg return undefined', async () => {
            jest.spyOn(documentsEisProviderMock, 'getPassports').mockResolvedValueOnce(registryPassportDTO)
            jest.spyOn(passportDataMapperMock, 'findIdCard').mockReturnValueOnce(internalPassport)

            await expect(
                passportService.getInternalPassportDocuments({
                    documentType,
                    itn,
                    designSystem: true,
                    user: user,
                    context: {
                        promisedPassports: Promise.resolve(registryPassportDTO),
                        promisedTaxpayerCardTableOrg: Promise.resolve(<TableBlockOrg>(<unknown>undefined)),
                    },
                }),
            ).rejects.toStrictEqual(new InternalServerError('TaxpayerCardTableOrg not found'))
        })

        it('should return documents through context', async () => {
            jest.spyOn(documentsEisProviderMock, 'getPassports').mockResolvedValueOnce(registryPassportDTO)
            jest.spyOn(passportDataMapperMock, 'findIdCard').mockReturnValueOnce(internalPassport)

            const documentInstance = getDocumentInstance(internalPassport)

            const toDocumentInstanceSpy = jest.spyOn(passportDataMapperMock, 'toDocumentInstance').mockReturnValueOnce([documentInstance])

            await expect(
                passportService.getInternalPassportDocuments({
                    documentType,
                    itn,
                    designSystem: true,
                    user,
                    context: {
                        promisedPassports: undefined,
                        promisedTaxpayerCardTableOrg: Promise.resolve(tableBlockOrg),
                    },
                }),
            ).resolves.toStrictEqual<GetDocumentsResult<InternalPassportInstance>>({
                documents: [internalPassport],
                designSystemDocuments: [documentInstance],
            })

            expect(toDocumentInstanceSpy).toHaveBeenCalledWith(PassportType.ID, registryPassportDTO, tableBlockOrg)
        })

        it('should throw DocumentNotFound  if dataMapper return undefined', async () => {
            jest.spyOn(documentsEisProviderMock, 'getPassports').mockResolvedValueOnce(registryPassportDTO)

            jest.spyOn(passportDataMapperMock, 'toDocumentInstance').mockReturnValueOnce([])

            await expect(
                passportService.getInternalPassportDocuments({
                    documentType,
                    itn,
                    designSystem: false,
                    user,
                    context: {
                        promisedPassports: undefined,
                    },
                }),
            ).rejects.toBeInstanceOf(DocumentNotFoundError)
        })

        it('should return internal passport', async () => {
            jest.spyOn(documentsEisProviderMock, 'getPassports').mockResolvedValueOnce(registryPassportDTO)

            jest.spyOn(passportDataMapperMock, 'toDocumentInstance').mockReturnValueOnce([])

            jest.spyOn(passportDataMapperMock, 'findIdCard').mockReturnValueOnce(internalPassport)

            await expect(
                passportService.getInternalPassportDocuments({
                    designSystem: false,
                    user,
                    context: {
                        promisedPassports: undefined,
                        promisedTaxpayerCardTableOrg: Promise.resolve(tableBlockOrg),
                    },
                    documentType,
                    itn,
                }),
            ).resolves.toStrictEqual<GetDocumentsResult<InternalPassportInstance>>({
                documents: [internalPassport],
                designSystemDocuments: [],
            })
        })
    })

    describe('method: `getForeignPassportDocuments`', () => {
        const documentType = DocumentType.ForeignPassport
        const itn = ''

        it('should throw InternalServerError for request without user parameter', async () => {
            await expect(passportService.getForeignPassportDocuments(<GetDocumentsParams>{})).rejects.toBeInstanceOf(InternalServerError)
        })

        it('should throw DocumentNotFound  if dataMapper return empty array', async () => {
            jest.spyOn(documentsEisProviderMock, 'getPassports').mockResolvedValueOnce(registryPassportDTO)

            jest.spyOn(passportDataMapperMock, 'toDocumentInstance').mockReturnValueOnce([])

            jest.spyOn(passportDataMapperMock, 'findForeignPassports').mockReturnValueOnce([])

            await expect(
                passportService.getForeignPassportDocuments({
                    documentType,
                    itn,
                    designSystem: false,
                    user,
                    context: {
                        promisedPassports: undefined,
                    },
                }),
            ).rejects.toBeInstanceOf(DocumentNotFoundError)
        })

        it('should return foreign passport', async () => {
            jest.spyOn(documentsEisProviderMock, 'getPassports').mockResolvedValueOnce(registryPassportDTO)

            jest.spyOn(passportDataMapperMock, 'toDocumentInstance').mockReturnValueOnce([])

            jest.spyOn(passportDataMapperMock, 'findForeignPassports').mockReturnValueOnce([foreignPassport])

            await expect(
                passportService.getForeignPassportDocuments({
                    documentType,
                    itn,
                    designSystem: false,
                    user,
                    context: {
                        promisedPassports: undefined,
                    },
                }),
            ).resolves.toStrictEqual<GetDocumentsResult<ForeignPassportInstance>>({
                documents: [foreignPassport],
                designSystemDocuments: [],
            })
        })

        it('should throw documentNotFoundError when designSystem is equal to true and context and returned empty array', async () => {
            jest.spyOn(passportDataMapperMock, 'findForeignPassports').mockReturnValueOnce([])

            await expect(
                passportService.getForeignPassportDocuments({
                    documentType,
                    itn,
                    designSystem: true,
                    user,
                    context: {
                        promisedPassports: Promise.resolve(undefined),
                    },
                }),
            ).rejects.toBeInstanceOf(DocumentNotFoundError)
        })

        it('should throw InternalServerError when designSystem is equal to true and promisedTaxpayerCardTableOrg return undefined', async () => {
            const expectedError = new InternalServerError('TaxpayerCardTableOrg not found')

            jest.spyOn(passportDataMapperMock, 'findForeignPassports').mockReturnValueOnce([foreignPassport])

            await expect(
                passportService.getForeignPassportDocuments({
                    documentType,
                    itn,
                    designSystem: true,
                    user,
                    context: {
                        promisedPassports: Promise.resolve(registryPassportDTO),
                        promisedTaxpayerCardTableOrg: <Promise<TableBlockOrg>>(<unknown>Promise.resolve(undefined)),
                    },
                }),
            ).rejects.toStrictEqual(expectedError)
        })

        it('should call passportDataMapper', async () => {
            jest.spyOn(passportDataMapperMock, 'findForeignPassports').mockReturnValueOnce([foreignPassport])

            await passportService.getForeignPassportDocuments({
                documentType,
                itn,
                designSystem: true,
                user,
                context: {
                    promisedPassports: Promise.resolve(registryPassportDTO),
                    promisedTaxpayerCardTableOrg: Promise.resolve(tableBlockOrg),
                },
            })

            expect(passportDataMapperMock.toDocumentInstance).toHaveBeenCalledWith(PassportType.P, registryPassportDTO, tableBlockOrg)
        })
    })

    describe('method: `getInternalPassportToProcess`', () => {
        it('should call passportDataMapper with returned passports', async () => {
            const passports = [internalPassport]

            jest.spyOn(documentsEisProviderMock, 'getPassports').mockResolvedValueOnce(registryPassportDTO)

            jest.spyOn(passportDataMapperMock, 'toDocumentInstanceV1').mockReturnValueOnce(passports)

            await passportService.getInternalPassportToProcess(user)

            expect(passportDataMapperMock.findIdCard).toHaveBeenNthCalledWith(6, passports)
        })
    })

    describe('method: `getPassportFull`', () => {
        it('should call provider DocumentsEisProvider', async () => {
            const collectPersonSpy = jest.spyOn(appUtilsMock, 'collectPerson')
            const collectRepresentative = jest.spyOn(appUtilsMock, 'collectRepresentative')
            const getPassportFullSpy = jest.spyOn(documentsEisProviderMock, 'getPassportFull')

            await passportService.getPassportFull(user)

            expect(collectPersonSpy).toHaveBeenCalledWith(user)
            expect(collectRepresentative).toHaveBeenCalledWith(user)

            expect(getPassportFullSpy).toHaveBeenCalled()
        })
    })

    describe('method: `getPassportByInn`', () => {
        const request: PassportByInnRequester = {
            itn: randomUUID(),
            lName: randomUUID(),
            fName: randomUUID(),
            mName: randomUUID(),
        }

        it('should call provider DocumentsDmsProvider', async () => {
            const getPassportFullSpy = jest.spyOn(documentsDmsProviderMock, 'getPassport')

            await passportService.getPassportByInn(request)

            expect(getPassportFullSpy).toHaveBeenCalledWith(request)
        })
    })

    describe('method: `getPassportsEntityByContext`', () => {
        it('should return empty array for undefined documents', async () => {
            await expect(
                passportService.getPassportsEntityByContext(
                    {
                        promisedPassports: Promise.resolve(undefined),
                    },
                    user,
                ),
            ).resolves.toStrictEqual([])
        })

        it('should call data mapper for any returned passport', async () => {
            const toDocumentInstanceV1Spy = jest.spyOn(passportDataMapperMock, 'toDocumentInstanceV1')

            await expect(
                passportService.getPassportsEntityByContext(
                    {
                        promisedPassports: Promise.resolve(registryPassportDTO),
                    },
                    user,
                ),
            ).resolves.toBeUndefined()

            expect(toDocumentInstanceV1Spy).toHaveBeenCalledWith(registryPassportDTO)
        })
    })

    describe('method: `getPassportsByPerson`', () => {
        it('should call provider documentsEisProvider', async () => {
            const person = {
                rnokpp: randomUUID(),
            }
            const representative = {
                rnokpp: randomUUID(),
                firstname: randomUUID(),
                lastname: randomUUID(),
                middlename: randomUUID(),
            }

            const getPassportsSpy = jest.spyOn(documentsEisProviderMock, 'getPassports')
            const toDocumentInstanceV1Spy = jest.spyOn(passportDataMapperMock, 'toDocumentInstanceV1')

            await expect(passportService.getPassportsByPerson(person, representative)).resolves.toBeUndefined()

            expect(getPassportsSpy).toHaveBeenCalledWith(person, representative)
            expect(toDocumentInstanceV1Spy).toHaveBeenCalled()
        })
    })

    describe('method: `getPassportsEntity`', () => {
        it('should return empty array', async () => {
            await expect(passportService.getPassportsEntity(user)).resolves.toStrictEqual([])
        })

        it('should call datamapper if any document returned', async () => {
            jest.spyOn(documentsEisProviderMock, 'getPassports').mockResolvedValueOnce(registryPassportDTO)

            const toDocumentInstanceV1Spy = jest.spyOn(passportDataMapperMock, 'toDocumentInstanceV1')

            await expect(passportService.getPassportsEntity(user)).resolves.toBeUndefined()

            expect(toDocumentInstanceV1Spy).toHaveBeenCalledWith(registryPassportDTO)
        })

        it('should publish error', async () => {
            jest.spyOn(documentsEisProviderMock, 'getPassports').mockRejectedValueOnce(new NotFoundError())
            const publishTaskSpy = jest.spyOn(taskMock, 'publish')

            await expect(passportService.getPassportsEntity(user)).resolves.toStrictEqual([])

            expect(publishTaskSpy).toHaveBeenCalled()
        })

        it('should throw error if provider failed to get passports', async () => {
            const error = new AccessDeniedError()

            jest.spyOn(documentsEisProviderMock, 'getPassports').mockRejectedValueOnce(error)

            await expect(passportService.getPassportsEntity(user)).rejects.toStrictEqual(error)
        })

        it('should return an empty array when parameter with  incorrect SessionType', async () => {
            await expect(passportService.getPassportsEntity(<AppUser>{})).resolves.toStrictEqual([])
        })
    })

    describe('method: `getRegistration`', () => {
        const passportByInn: PassportByInn = {
            registration: {
                address: {
                    registrationDate: '',
                    cancelregistrationDate: '',
                },
            },
            registrationV1: {
                address: {
                    registration_inf: true,
                },
            },
        }

        const expectedCodifier = {
            name: 'name',
            categoryId: new mongo.ObjectId(),
            level: 'level',
            firstLevel: 'firstLevel',
            thirdLevel: 'thirdLevel',
            koatuu: [],
        }

        it('should call registration by inn', async () => {
            const getPassportSpy = jest.spyOn(documentsDmsProviderMock, 'getPassport').mockResolvedValueOnce(passportByInn)

            await expect(passportService.getRegistration(user, ['passportByInn'])).resolves.toStrictEqual({
                address: { cancelregistrationDate: '', registrationDate: '' },
            })

            expect(getPassportSpy).toHaveBeenCalledWith(user)
        })

        it('should call enrichRegistrationAddressByKoatuu', async () => {
            const passportByInnWithAddressKoatuu: PassportByInn = {
                registration: {
                    address: {
                        registrationDate: '',
                        cancelregistrationDate: undefined,
                        addressKoatuu: 'addressKoatuu',
                    },
                },
                registrationV1: {
                    address: {
                        registration_inf: true,
                    },
                },
            }

            jest.spyOn(documentsDmsProviderMock, 'getPassport').mockResolvedValueOnce(passportByInnWithAddressKoatuu)

            const findCodifierByKoatuuSpy = jest.spyOn(addressServiceMock, 'findCodifierByKoatuu').mockResolvedValueOnce(expectedCodifier)

            await expect(passportService.getRegistration(user, ['passportByInn'])).resolves.toStrictEqual({
                address: {
                    addressGromKatottg: expectedCodifier.thirdLevel,
                    addressKatottg: expectedCodifier.level,
                    addressKoatuu: passportByInnWithAddressKoatuu.registration.address?.addressKoatuu,
                    cancelregistrationDate: undefined,
                    registrationDate: '',
                },
            })

            expect(findCodifierByKoatuuSpy).toHaveBeenCalledWith(passportByInnWithAddressKoatuu.registration.address?.addressKoatuu)
        })

        it('when findCodifierByKoatuu throwed error, should return registration', async () => {
            const passportByInnWithAddressKoatuu: PassportByInn = {
                registration: {
                    address: {
                        registrationDate: '',
                        cancelregistrationDate: undefined,
                        addressKoatuu: 'addressKoatuu',
                    },
                },
                registrationV1: {
                    address: {
                        registration_inf: true,
                    },
                },
            }

            jest.spyOn(documentsDmsProviderMock, 'getPassport').mockResolvedValueOnce(passportByInnWithAddressKoatuu)

            jest.spyOn(addressServiceMock, 'findCodifierByKoatuu').mockRejectedValueOnce(new Error())

            await expect(passportService.getRegistration(user, ['passportByInn'])).resolves.toStrictEqual(
                merge(
                    {},
                    {
                        address: passportByInnWithAddressKoatuu.registration.address,
                    },
                ),
            )
        })

        it('should get communityCode', async () => {
            const expectedCode = 'expectedCode'

            jest.spyOn(documentsDmsProviderMock, 'getPassport').mockResolvedValueOnce(
                merge(passportByInn, {
                    registration: {
                        address: {
                            addressKatottg: 'not empty',
                        },
                    },
                }),
            )

            jest.spyOn(addressServiceMock, 'findCommunityCodeByKodificatorCode').mockResolvedValueOnce(expectedCode)

            await expect(passportService.getRegistration(user, ['passportByInn'])).resolves.toMatchObject({
                address: { addressGromKatottg: expectedCode },
            })
        })

        it('when findCommunityCodeByKodificatorCode throw error store it to log and return registration', async () => {
            const error = new Error()
            const registrationByInn = merge(passportByInn, {
                registration: {
                    address: {
                        addressKatottg: 'not empty',
                    },
                },
            })

            jest.spyOn(documentsDmsProviderMock, 'getPassport').mockResolvedValueOnce(registrationByInn)

            jest.spyOn(addressServiceMock, 'findCommunityCodeByKodificatorCode').mockRejectedValueOnce(error)

            await expect(passportService.getRegistration(user, ['passportByInn'])).resolves.toMatchObject({
                address: registrationByInn.registration.address,
            })

            expect(loggerMock.error).toHaveBeenCalled()
        })

        it('should return registration when  property addressKatottg && addressGromKatottg exist', async () => {
            const registrationByInn = merge(passportByInn, {
                registration: {
                    address: {
                        addressKatottg: 'addressKatottg',
                        addressGromKatottg: 'addressGromKatottg',
                    },
                },
            })

            jest.spyOn(documentsDmsProviderMock, 'getPassport').mockResolvedValueOnce(registrationByInn)

            await expect(passportService.getRegistration(user, ['passportByInn'])).resolves.toMatchObject({
                address: registrationByInn.registration.address,
            })
        })

        it('should get codifier', async () => {
            const addressKoatuu = 'not empty'
            const registrationByInn = merge(passportByInn, {
                registration: {
                    address: {
                        addressKoatuu,
                    },
                },
            })

            jest.spyOn(documentsDmsProviderMock, 'getPassport').mockResolvedValueOnce(registrationByInn)

            jest.spyOn(addressServiceMock, 'findCodifierByKoatuu').mockResolvedValueOnce(expectedCodifier)

            await expect(passportService.getRegistration(user, ['passportByInn'])).resolves.toMatchObject({
                address: { addressKatottg: 'addressKatottg', addressGromKatottg: 'addressGromKatottg' },
            })
        })

        it('should throw error without storing info in the log', async () => {
            const error = new ApiError('message', HttpStatusCode.FORBIDDEN)

            jest.spyOn(documentsDmsProviderMock, 'getPassport').mockRejectedValueOnce(error)

            await expect(passportService.getRegistration(user, ['passportByInn'])).rejects.toStrictEqual(error)

            expect(loggerMock.warn).not.toHaveBeenCalled()
        })

        it('should throw error with storing info in the log', async () => {
            const error = new ApiError('message', HttpStatusCode.NOT_FOUND)

            jest.spyOn(documentsDmsProviderMock, 'getPassport').mockRejectedValueOnce(error)

            await expect(passportService.getRegistration(user, ['passportByInn'])).resolves.toBeUndefined()

            expect(loggerMock.warn).toHaveBeenCalled()
        })

        it('should call registration by passport', async () => {
            const getPassportSpy = jest.spyOn(documentsEisProviderMock, 'getPassports').mockResolvedValueOnce(registryPassportDTO)
            const expectedPassportRegistrationInfo = {
                address: {
                    regionName: 'М. КИЇВ',
                    cityDistrictName: 'ШЕВЧЕНКІВСЬКИЙ',
                    registrationDate: '20.07.1969',
                    cancelregistrationDate: undefined,
                },
                registrationDate: moment('20.07.1969', 'DD.MM.YYYY').toDate(),
                fullName: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69',
            }

            jest.spyOn(passportDataMapperMock, 'toRegistration').mockReturnValueOnce(expectedPassportRegistrationInfo)

            const infoSpy = jest.spyOn(loggerMock, 'info')

            await expect(passportService.getRegistration(user, ['passport'])).resolves.toStrictEqual(expectedPassportRegistrationInfo)

            expect(getPassportSpy).toHaveBeenCalled()
            expect(infoSpy).toHaveBeenCalled()
        })

        it('should return undefined', async () => {
            jest.spyOn(documentsEisProviderMock, 'getPassports').mockRejectedValueOnce(new NotFoundError())

            await expect(passportService.getRegistration(user, ['passport'])).resolves.toBeUndefined()
        })

        it('should call logger undefined', async () => {
            jest.spyOn(documentsEisProviderMock, 'getPassports').mockRejectedValueOnce(
                new ExternalCommunicatorError('message', HttpStatusCode.BAD_REQUEST),
            )
            await expect(passportService.getRegistration(user, ['passport'])).rejects.toBeInstanceOf(ApiError)
        })
    })

    describe('method: `getPassportToProcess`', () => {
        it('should return internal passport', async () => {
            jest.spyOn(passportDataMapperMock, 'findIdCard').mockReturnValueOnce(internalPassport)

            await expect(passportService.getPassportToProcess(user)).resolves.toStrictEqual(internalPassport)
        })

        it('should return foreign passport', async () => {
            jest.spyOn(passportDataMapperMock, 'findForeignPassports').mockReturnValueOnce([foreignPassport])

            await expect(passportService.getPassportToProcess(user)).resolves.toStrictEqual(foreignPassport)
        })

        it('should return undefined', async () => {
            jest.spyOn(passportDataMapperMock, 'findForeignPassports').mockReturnValueOnce([])

            await expect(passportService.getPassportToProcess(user)).resolves.toBeUndefined()
        })
    })

    describe('method: `getRegistrationPlaceForPassport`', () => {
        it('should return currentRegistrationPlaceUA from internal passport', async () => {
            jest.spyOn(passportDataMapperMock, 'findIdCard').mockReturnValueOnce(internalPassportInstance)

            jest.spyOn(passportDataMapperMock, 'findForeignPassports').mockReturnValueOnce([])

            await expect(passportService.getRegistrationPlaceForPassport(user)).resolves.toBe(
                internalPassportInstance.currentRegistrationPlaceUA,
            )
        })

        it('should return currentRegistrationPlaceUA from foreign passport', async () => {
            jest.spyOn(passportDataMapperMock, 'findIdCard')

            jest.spyOn(passportDataMapperMock, 'findForeignPassports').mockReturnValueOnce([foreignPassportInstance])

            await expect(passportService.getRegistrationPlaceForPassport(user)).resolves.toBe(
                foreignPassportInstance.currentRegistrationPlaceUA,
            )
        })
    })

    describe('method: `getRegistrationInfoFromPassports`', () => {
        it('should throw NotFoundError', async () => {
            await expect(passportService.getRegistrationInfoFromPassports(portalUser)).rejects.toBeInstanceOf(NotFoundError)
        })

        it('should call provider', async () => {
            const getPassportsSpy = jest.spyOn(documentsEisProviderMock, 'getPassports')
            const registrationAddress: RegistrationAddress = {
                registrationAddress: '',
            }
            const getRegistrationAddressSpy = jest
                .spyOn(passportDataMapperMock, 'getRegistrationAddress')
                .mockReturnValueOnce(registrationAddress)

            await passportService.getRegistrationInfoFromPassports(portalUser)

            expect(getPassportsSpy).toHaveBeenCalled()
            expect(getRegistrationAddressSpy).toHaveBeenCalled()
        })
    })

    describe('method: `enrichDocumentWithPhoto`', () => {
        it('should call analytics', () => {
            const analyticsCategory = ServiceAnalyticsCategory.VerificationDocuments
            const analyticsAction = 'analytics-action'
            const actionResult = ServiceAnalyticsActionResult.Success
            const analyticsData = {
                test: 'test',
            }

            const analyticSpy = jest.spyOn(analyticsMock, 'log')

            jest.spyOn(passportDataMapperMock, 'findForeignPassports').mockReturnValueOnce([foreignPassport])

            passportService.enrichDocumentWithPhoto(internalPassport, [foreignPassport], analyticsCategory, analyticsAction, analyticsData)

            expect(analyticSpy).toHaveBeenCalledWith(analyticsCategory, analyticsAction, actionResult, analyticsData)
        })

        it('should add photo and change status for document', () => {
            jest.spyOn(passportDataMapperMock, 'findForeignPassports').mockReturnValueOnce([foreignPassport])

            expect(passportService.enrichDocumentWithPhoto(internalPassport, [foreignPassport])).toStrictEqual(
                merge(internalPassport, {
                    photo: foreignPassport.photo,
                    docStatus: DocStatus.Ok,
                }),
            )
        })

        it('should store analytics result error and store message to error log when passports is empty array', async () => {
            expect(passportService.enrichDocumentWithPhoto(foreignPassport, [])).toStrictEqual(foreignPassport)

            expect(loggerMock.error).toHaveBeenCalledWith(expect.any(String), {
                docId: foreignPassport.id,
            })
        })
    })

    describe('method: `extractPhotoFromPassports`', () => {
        it('should return undefined for empty array', () => {
            expect(passportService.extractPhotoFromPassports([])).toBeUndefined()
        })

        it('should return photo from internalPassport', () => {
            jest.spyOn(passportDataMapperMock, 'findIdCard').mockReturnValueOnce(internalPassport)
            jest.spyOn(passportDataMapperMock, 'findForeignPassports').mockReturnValueOnce([])

            expect(passportService.extractPhotoFromPassports([internalPassport])).toBe(internalPassport.photo)
        })

        it('should return photo from foreignPassport', () => {
            jest.spyOn(passportDataMapperMock, 'findForeignPassports').mockReturnValueOnce([foreignPassport])

            expect(passportService.extractPhotoFromPassports([foreignPassport])).toBe(foreignPassport.photo)
        })
    })

    describe('method: `verifyInternalPassport`', () => {
        it('should return DocumentNotFoundError', async () => {
            jest.spyOn(passportDataMapperMock, 'findIdCard').mockReturnValueOnce(internalPassport)

            await expect(
                passportService.verifyInternalPassport({
                    requestor: user,
                    docId: 'fakeId',
                    ownerType: OwnerType.owner,
                    docStatus: DocStatus.Ok,
                }),
            ).rejects.toBeInstanceOf(DocumentNotFoundError)
        })

        it('should return internalPassport', async () => {
            const localization = 'localization'

            jest.spyOn(passportDataMapperMock, 'findIdCard').mockReturnValueOnce(internalPassport)

            await expect(
                passportService.verifyInternalPassport({
                    requestor: user,
                    docId: internalPassport.id,
                    ownerType: OwnerType.owner,
                    docStatus: DocStatus.Ok,
                }),
            ).resolves.toStrictEqual(merge(internalPassport, { shareLocalization: localization }))
        })
    })

    describe('method: `verifyForeignPassport`', () => {
        it('should return DocumentNotFoundError', async () => {
            jest.spyOn(passportDataMapperMock, 'findForeignPassports').mockReturnValueOnce([foreignPassport])

            await expect(
                passportService.verifyForeignPassport({
                    requestor: user,
                    docId: 'fakeId',
                    ownerType: OwnerType.owner,
                    docStatus: DocStatus.Ok,
                }),
            ).rejects.toBeInstanceOf(DocumentNotFoundError)
        })

        it('should return internalPassport', async () => {
            const localization = 'localization'

            jest.spyOn(passportDataMapperMock, 'findForeignPassports').mockReturnValueOnce([foreignPassport])

            await expect(
                passportService.verifyForeignPassport({
                    requestor: user,
                    docId: foreignPassport.id,
                    ownerType: OwnerType.owner,
                    docStatus: DocStatus.Ok,
                }),
            ).resolves.toStrictEqual(merge(foreignPassport, { shareLocalization: localization }))
        })
    })
})
