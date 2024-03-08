import moment from 'moment'

import DiiaLogger from '@diia-inhouse/diia-logger'
import { mockInstance } from '@diia-inhouse/test'
import { DocStatus, DocumentStatus, DocumentType, LicenseType, TickerAtmType, TickerAtmUsage } from '@diia-inhouse/types'

import DriverLicenseDataMapper from '@src/documents/driverLicense/dataMappers/document'
import { PluginConfig } from '@src/documents/driverLicense/interfaces/config'
import {
    DriverLicenseDocument,
    DriverLicenseDocumentDTO,
    RegistryDriverLicenseDTO,
} from '@src/documents/driverLicense/interfaces/providers/hsc'
import { getDriverLicense } from '@src/documents/driverLicense/providers/hsc/mockData'

import DocumentAttributesService from '@services/documentAttributes'

import DesignSystemDataMapper from '@dataMappers/designSystemDataMapper'

import Utils from '@utils/index'

import photo from '@mocks/stubs/photo'

import { AppConfig } from '@interfaces/config'
import { DocumentTickerCode, DocumentTickerPlaceholder } from '@interfaces/services/documentAttributes'

describe(`Data mappers DriverLicenseDataMapper`, () => {
    const documentAttributesServiceMock = mockInstance(DocumentAttributesService)
    const designSystemDataMapper = mockInstance(DesignSystemDataMapper)
    const appUtilsMock = mockInstance(Utils)
    const config = <AppConfig & PluginConfig>{
        [DocumentType.DriverLicense]: {
            providerIsEnabled: true,
            returnExpired: true,
        },
    }
    const loggerMock = mockInstance(DiiaLogger)
    const driverLicenseDataMapper = new DriverLicenseDataMapper(
        appUtilsMock,
        config,
        loggerMock,
        designSystemDataMapper,
        documentAttributesServiceMock,
    )
    const dateFormat = 'YYYY-MM-DD'
    const currentDate = moment().format(dateFormat)
    const oneYearAgo = moment().subtract(1, 'years').format(dateFormat)
    const twoYearsAgo = moment().subtract(2, 'years').format(dateFormat)
    const fiveYearsAgo = moment().subtract(5, 'years').format(dateFormat)
    const threeYearsAfter = moment().add(3, 'years').format(dateFormat)
    const twoYearsAfter = moment().add(2, 'years').format(dateFormat)

    describe('toDocumentInstanceV1', () => {
        describe('check driver license type', () => {
            it('should return license is issued first', async () => {
                // arrange
                const driverLicenseRegistryResponse = getDriverLicense({
                    driverLicense: [
                        <DriverLicenseDocumentDTO>{
                            ddoc: oneYearAgo,
                            dend: currentDate,
                        },
                    ],
                })

                // act
                const response = driverLicenseDataMapper.toDocumentInstanceV1(driverLicenseRegistryResponse, undefined)

                // assert
                expect(response[0].type).toBe(LicenseType.issuedFirst)
            })

            it('should return license is issued first if first ddoc day', async () => {
                // arrange
                const driverLicenseRegistryResponse = getDriverLicense({
                    driverLicense: [
                        <DriverLicenseDocumentDTO>{
                            ddoc: currentDate,
                            dend: twoYearsAfter,
                        },
                    ],
                })

                // act
                const response = driverLicenseDataMapper.toDocumentInstanceV1(driverLicenseRegistryResponse, undefined)

                // assert
                expect(response[0].type).toBe(LicenseType.issuedFirst)
            })

            it('should return license is issued first if last dend day', async () => {
                // arrange
                const driverLicenseRegistryResponse = getDriverLicense({
                    driverLicense: [
                        <DriverLicenseDocumentDTO>{
                            ddoc: twoYearsAgo,
                            dend: currentDate,
                        },
                    ],
                })

                // act
                const response = driverLicenseDataMapper.toDocumentInstanceV1(driverLicenseRegistryResponse, undefined)

                // assert
                expect(response[0].type).toBe(LicenseType.issuedFirst)
            })

            it('should return license is permanent', async () => {
                // arrange
                const driverLicenseRegistryResponse = getDriverLicense({
                    driverLicense: [
                        <DriverLicenseDocumentDTO>{
                            ddoc: fiveYearsAgo,
                            dend: threeYearsAfter,
                        },
                    ],
                })

                // act
                const response = driverLicenseDataMapper.toDocumentInstanceV1(driverLicenseRegistryResponse, undefined)

                // assert
                expect(response[0].type).toBe(LicenseType.permanent)
            })

            it('should skip and return empty list in case expired is not allowed to be return by config', () => {
                // arrange
                const driverLicenseRegistryResponse = getDriverLicense({
                    driverLicense: [
                        <DriverLicenseDocumentDTO>{
                            ddoc: twoYearsAfter,
                            dend: currentDate,
                        },
                    ],
                })

                jest.spyOn(appUtilsMock, 'isExpiredDate').mockReturnValueOnce(false).mockReturnValueOnce(true)

                const driverLicenseDataMapperDoNotReturnExpired = new DriverLicenseDataMapper(
                    appUtilsMock,
                    <AppConfig & PluginConfig>{
                        [DocumentType.DriverLicense]: {
                            providerIsEnabled: true,
                            returnExpired: false,
                        },
                    },
                    loggerMock,
                    designSystemDataMapper,
                    documentAttributesServiceMock,
                )

                // act
                const response = driverLicenseDataMapperDoNotReturnExpired.toDocumentInstanceV1(driverLicenseRegistryResponse, undefined)

                // assert
                expect(response).toEqual([])
            })

            it('should return list of inactive license entries', () => {
                // arrange
                const driverLicenseRegistryResponse = getDriverLicense({
                    driverLicense: [
                        <DriverLicenseDocumentDTO>{
                            ddoc: twoYearsAfter,
                            dend: threeYearsAfter,
                        },
                    ],
                })

                jest.spyOn(appUtilsMock, 'isExpiredDate').mockReturnValueOnce(true)

                // act
                const response = driverLicenseDataMapper.toDocumentInstanceV1(driverLicenseRegistryResponse, undefined)

                // assert
                expect(response[0].type).toBe(LicenseType.issuedFirst)
            })
        })
    })

    describe('toDocumentInstance', () => {
        const driverLicenseDto = getDriverLicense({
            driverLicense: [
                <DriverLicenseDocumentDTO>{
                    ddoc: threeYearsAfter,
                    dend: currentDate,
                    photo,
                },
            ],
        })
        const driverLicenseDataMapperDoNotReturnExpired = new DriverLicenseDataMapper(
            appUtilsMock,
            <AppConfig & PluginConfig>{
                [DocumentType.DriverLicense]: {
                    providerIsEnabled: true,
                    returnExpired: false,
                },
            },
            loggerMock,
            designSystemDataMapper,
            documentAttributesServiceMock,
        )

        it.each([
            [{ driverLicenseRegistryResponse: driverLicenseDto, isExpiredDate: false, expectedDocStatus: DocStatus.Ok }],
            [
                {
                    driverLicenseRegistryResponse: <RegistryDriverLicenseDTO>(
                        (<unknown>{ ...driverLicenseDto, driverLicense: [{ ...driverLicenseDto.driverLicense[0], sdoc: null }] })
                    ),
                    isExpiredDate: false,
                    expectedDocStatus: DocStatus.AdditionalVerification,
                },
            ],
            [
                {
                    driverLicenseRegistryResponse: <RegistryDriverLicenseDTO>{
                        ...driverLicenseDto,
                        driverLicense: [{ ...driverLicenseDto.driverLicense[0], categories: [] }],
                    },
                    isExpiredDate: false,
                    expectedDocStatus: DocStatus.AdditionalVerification,
                },
            ],
            [
                {
                    driverLicenseRegistryResponse: <RegistryDriverLicenseDTO>{
                        ...driverLicenseDto,
                        client: { ...driverLicenseDto.client, lastNameUA: '' },
                    },
                    isExpiredDate: false,
                    expectedDocStatus: DocStatus.AdditionalVerification,
                },
            ],
            [{ driverLicenseRegistryResponse: driverLicenseDto, isExpiredDate: true, expectedDocStatus: DocStatus.Inactive }],
            [
                {
                    driverLicenseRegistryResponse: <RegistryDriverLicenseDTO>{
                        ...driverLicenseDto,
                        driverLicense: [{ ...driverLicenseDto.driverLicense[0], status: { ID: String(DocumentStatus.NEED_CONFIRMATION) } }],
                    },
                    isExpiredDate: false,
                    expectedDocStatus: DocStatus.OldModel,
                },
            ],
            [
                {
                    driverLicenseRegistryResponse: <RegistryDriverLicenseDTO>{
                        ...driverLicenseDto,
                        driverLicense: [{ ...driverLicenseDto.driverLicense[0], photo: '' }],
                    },
                    isExpiredDate: false,
                    expectedDocStatus: DocStatus.NoPhoto,
                },
            ],
        ])(
            'should successfully convert to document instance when %s',
            ({ driverLicenseRegistryResponse, isExpiredDate, expectedDocStatus }) => {
                // arrange
                jest.spyOn(documentAttributesServiceMock, 'getUpdatedAtValue')
                    .mockReturnValueOnce(currentDate)
                    .mockReturnValueOnce(currentDate)
                jest.spyOn(documentAttributesServiceMock, 'getTicker')
                    .mockReturnValueOnce({ type: TickerAtmType.informative, usage: TickerAtmUsage.document, value: 'value-ua' })
                    .mockReturnValueOnce({ type: TickerAtmType.informative, usage: TickerAtmUsage.document, value: 'value-en' })

                jest.spyOn(appUtilsMock, 'isExpiredDate').mockReturnValue(isExpiredDate)

                // act
                const response = driverLicenseDataMapperDoNotReturnExpired.toDocumentInstance(driverLicenseRegistryResponse, undefined)

                // assert
                expect(response[0].docStatus).toBe(expectedDocStatus)
                expect(documentAttributesServiceMock.getUpdatedAtValue).toHaveBeenCalledWith()
                expect(documentAttributesServiceMock.getTicker).toHaveBeenCalledWith({
                    code: DocumentTickerCode.ValidUntil,
                    templateParams: {
                        [DocumentTickerPlaceholder.ValidUntil]: 'Не вказано',
                        [DocumentTickerPlaceholder.UpdatedAt]: currentDate,
                    },
                    localization: 'ua',
                    documentType: DocumentType.DriverLicense,
                })
                expect(documentAttributesServiceMock.getTicker).toHaveBeenCalledWith({
                    code: DocumentTickerCode.ValidUntil,
                    templateParams: {
                        [DocumentTickerPlaceholder.ValidUntil]: 'Не вказано',
                        [DocumentTickerPlaceholder.UpdatedAt]: currentDate,
                    },
                    localization: 'eng',
                    documentType: DocumentType.DriverLicense,
                })
            },
        )

        it('should skip in case is expired and returnExpired === false', () => {
            // arrange
            jest.spyOn(appUtilsMock, 'isExpiredDate').mockReturnValueOnce(false).mockReturnValueOnce(true)

            // act
            const response = driverLicenseDataMapperDoNotReturnExpired.toDocumentInstance(driverLicenseDto, undefined)

            // assert
            expect(response).toEqual([])
        })
    })

    describe('getFullEntity', () => {
        it('should successfully compose full entity', () => {
            // arrange
            const driverLicenseDto = getDriverLicense({
                driverLicense: [
                    <DriverLicenseDocumentDTO>{
                        ddoc: threeYearsAfter,
                        dend: currentDate,
                    },
                ],
            })
            const { client, driverLicense } = driverLicenseDto

            // act
            const response = driverLicenseDataMapper.toFullEntity(driverLicenseDto)

            // assert
            expect(response).toEqual({
                driverLicense: <DriverLicenseDocument[]>[
                    {
                        categories: ['B'],
                        dend: driverLicense[0].dend,
                        department: driverLicense[0].department,
                        id: driverLicense[0].id,
                        ndoc: driverLicense[0].ndoc,
                        photo: driverLicense[0].photo,
                        sdoc: driverLicense[0].sdoc,
                        status: driverLicense[0].status,
                    },
                ],
                client,
                clientAddr: [expect.any(Object)],
            })
        })
    })
})
