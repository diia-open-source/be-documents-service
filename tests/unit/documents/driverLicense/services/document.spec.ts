import Logger from '@diia-inhouse/diia-logger'
import { AccessDeniedError, BadRequestError, DocumentNotFoundError, InternalServerError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocStatus, DocumentType, DriverLicense, OwnerType } from '@diia-inhouse/types'

import DriverLicenseDataMapper from '@src/documents/driverLicense/dataMappers/document'
import DriverLicenseHscProvider from '@src/documents/driverLicense/providers/hsc'
import { getDriverLicense } from '@src/documents/driverLicense/providers/hsc/mockData'
import DriverLicenseService from '@src/documents/driverLicense/services/document'

import PassportService from '@services/passport'

import { getDocumentInstance } from '@tests/mocks/stubs/documentInstance'

import { DefaultValue, GetDocumentsResult } from '@interfaces/services/documents'
import { AssertStrategyParams } from '@interfaces/services/documentVerification'

describe(`Service ${DriverLicenseService.name}`, () => {
    const now = new Date()
    const testKit = new TestKit()
    const logger = mockInstance(Logger)
    const passportService = mockInstance(PassportService)
    const driverLicenseDataMapper = mockInstance(DriverLicenseDataMapper)
    const driverLicenseHscProvider = mockInstance(DriverLicenseHscProvider)

    const service = new DriverLicenseService(logger, passportService, driverLicenseHscProvider, driverLicenseDataMapper)

    const { user } = testKit.session.getUserSession()

    beforeEach(() => {
        jest.useFakeTimers({ now })
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    describe(`method: ${service.getDriverLicenses.name}`, () => {
        it('should return driver licenses list', async () => {
            const driverLicenseDto = getDriverLicense()
            const driverLicense = testKit.docs.getDriverLicense()

            jest.spyOn(driverLicenseHscProvider, 'getDriverLicense').mockResolvedValueOnce(driverLicenseDto)
            jest.spyOn(driverLicenseDataMapper, 'toDocumentInstanceV1').mockReturnValueOnce([driverLicense])

            expect(await service.getDriverLicenses(user.itn, undefined, DefaultValue.NotProvided, true)).toMatchObject([driverLicense])
            expect(driverLicenseHscProvider.getDriverLicense).toHaveBeenCalledWith(user.itn, true)
            expect(driverLicenseDataMapper.toDocumentInstanceV1).toHaveBeenCalledWith(driverLicenseDto, undefined, DefaultValue.NotProvided)
        })
    })

    describe(`method: ${service.getDocuments.name}`, () => {
        it('should return driver license documents via toDocumentInstance method', async () => {
            const params = {
                documentType: DocumentType.DriverLicense,
                itn: user.itn,
                designSystem: true,
                context: {},
                user,
            }
            const internalPassport = testKit.docs.getInternalPassport()
            const passport = { ...internalPassport, department: 'department' }
            const driverLicenseDto = getDriverLicense()
            const driverLicense = testKit.docs.getDriverLicense()
            const documentInstance = getDocumentInstance(driverLicense)

            jest.spyOn(passportService, 'getPassportsEntityByContext').mockResolvedValueOnce([passport])
            jest.spyOn(driverLicenseHscProvider, 'getDriverLicense').mockResolvedValueOnce(driverLicenseDto)
            jest.spyOn(driverLicenseDataMapper, 'toDocumentInstanceV1').mockReturnValueOnce([driverLicense])
            jest.spyOn(driverLicenseDataMapper, 'toDocumentInstance').mockReturnValueOnce([documentInstance])

            // Act
            const result = await service.getDocuments(params)

            // Assert
            expect(result).toMatchObject<GetDocumentsResult<DriverLicense>>({
                documents: [driverLicense],
                designSystemDocuments: [documentInstance],
            })
            expect(driverLicenseDataMapper.toDocumentInstance).toHaveBeenCalledWith(driverLicenseDto, passport?.recordNumber)
        })

        it('should return driver license documents via toDocumentInstanceV1 method', async () => {
            const params = {
                documentType: DocumentType.DriverLicense,
                itn: user.itn,
                designSystem: false,
                context: {},
                user,
            }
            const internalPassport = testKit.docs.getInternalPassport()
            const passport = { ...internalPassport, department: 'department' }
            const driverLicenseDto = getDriverLicense()
            const driverLicense = testKit.docs.getDriverLicense()

            jest.spyOn(passportService, 'getPassportsEntityByContext').mockResolvedValueOnce([passport])
            jest.spyOn(driverLicenseHscProvider, 'getDriverLicense').mockResolvedValueOnce(driverLicenseDto)
            jest.spyOn(driverLicenseDataMapper, 'toDocumentInstanceV1').mockReturnValueOnce([driverLicense])

            // Act
            const result = await service.getDocuments(params)

            // Assert
            expect(result).toMatchObject<GetDocumentsResult<DriverLicense>>({
                documents: [driverLicense],
                designSystemDocuments: [],
            })
            expect(driverLicenseDataMapper.toDocumentInstanceV1).toHaveBeenCalledWith(driverLicenseDto, passport?.recordNumber)
        })
    })

    describe(`method: ${service.getDocumentsWithPhoto.name}`, () => {
        it('should throw InternalServerError if user is not defined', async () => {
            const params = {
                documentType: DocumentType.DriverLicense,
                itn: user.itn,
                designSystem: false,
                context: {},
            }

            await expect(service.getDocumentsWithPhoto(params)).rejects.toThrow(new InternalServerError('User is not defined'))
        })

        it('should return driver license documents with photo', async () => {
            const params = {
                documentType: DocumentType.DriverLicense,
                itn: user.itn,
                designSystem: false,
                context: {},
                user,
            }
            const internalPassport = testKit.docs.getInternalPassport()
            const passport = { ...internalPassport, department: 'department' }
            const driverLicenseDto = getDriverLicense()
            const driverLicense = testKit.docs.getDriverLicense()

            jest.spyOn(passportService, 'getPassportsEntityByContext').mockResolvedValueOnce([passport])
            jest.spyOn(driverLicenseHscProvider, 'getDriverLicense').mockResolvedValueOnce(driverLicenseDto)
            jest.spyOn(driverLicenseDataMapper, 'toDocumentInstanceV1').mockReturnValueOnce([driverLicense])

            expect(await service.getDocumentsWithPhoto(params)).toMatchObject({ documents: [driverLicense] })
            expect(driverLicenseDataMapper.toDocumentInstanceV1).toHaveBeenCalledWith(driverLicenseDto, passport?.recordNumber)
        })
    })

    describe(`method: ${service.getDriverLicenseFull.name}`, () => {
        it('should return driver license full', async () => {
            const driverLicense = getDriverLicense()
            const modifiedObject = {
                ...driverLicense,
                driverLicense: [
                    {
                        ...driverLicense.driverLicense[0],
                        categories: ['category1'],
                    },
                ],
            }

            jest.spyOn(driverLicenseHscProvider, 'getDriverLicenseFull').mockResolvedValueOnce(modifiedObject)

            expect(await service.getDriverLicenseFull(user.itn)).toMatchObject(modifiedObject)
            expect(driverLicenseHscProvider.getDriverLicenseFull).toHaveBeenCalledWith(user.itn)
        })
    })

    describe(`method: ${service.assertDocumentIsValid.name}`, () => {
        it('should throw AccessDeniedError if documents not found', async () => {
            const params = <AssertStrategyParams>{
                documentId: 'documentId',
                documentType: DocumentType.DriverLicense,
                ownerType: OwnerType.owner,
                documentAssertParams: {
                    itn: user.itn,
                },
            }
            const driverLicenseDto = getDriverLicense()

            jest.spyOn(driverLicenseHscProvider, 'getDriverLicense').mockResolvedValueOnce(driverLicenseDto)
            jest.spyOn(driverLicenseDataMapper, 'toDocumentInstanceV1').mockReturnValueOnce([])

            await expect(service.assertDocumentIsValid(params)).rejects.toThrow(new AccessDeniedError())
            expect(driverLicenseHscProvider.getDriverLicense).toHaveBeenCalledWith(user.itn, undefined)
        })

        it('should throw DocumentNotFoundError if there is no driver license document with given document id', async () => {
            const params = <AssertStrategyParams>{
                documentId: 'wrong-id',
                documentType: DocumentType.DriverLicense,
                ownerType: OwnerType.owner,
                documentAssertParams: {
                    itn: user.itn,
                },
            }
            const driverLicenseDto = getDriverLicense()
            const driverLicense = testKit.docs.getDriverLicense()

            jest.spyOn(driverLicenseHscProvider, 'getDriverLicense').mockResolvedValueOnce(driverLicenseDto)
            jest.spyOn(driverLicenseDataMapper, 'toDocumentInstanceV1').mockReturnValueOnce([driverLicense])

            await expect(service.assertDocumentIsValid(params)).rejects.toThrow(
                new DocumentNotFoundError(`There is no driver license document with id ${params.documentId}`),
            )
            expect(driverLicenseHscProvider.getDriverLicense).toHaveBeenCalledWith(user.itn, undefined)
        })
    })

    describe(`method: ${service.verifyDocument.name}`, () => {
        it('should throw BadRequestError if driver license not found', async () => {
            const verifyOtpResponse = {
                requestor: user,
                docId: 'docId',
                ownerType: OwnerType.owner,
                docStatus: DocStatus.Ok,
            }
            const driverLicenseDto = getDriverLicense()

            jest.spyOn(passportService, 'getPassportsEntityByContext').mockRejectedValueOnce(new Error('error occured'))
            jest.spyOn(driverLicenseHscProvider, 'getDriverLicense').mockResolvedValueOnce(driverLicenseDto)
            jest.spyOn(driverLicenseDataMapper, 'toDocumentInstanceV1').mockReturnValueOnce([])

            await expect(service.verifyDocument(verifyOtpResponse)).rejects.toThrow(new BadRequestError('DriverLicense is not found'))
            expect(passportService.getPassportsEntityByContext).toHaveBeenCalledWith({}, user)
            expect(driverLicenseHscProvider.getDriverLicense).toHaveBeenCalledWith(user.itn, undefined)
        })

        it('should return driver license with photo', async () => {
            const driverLicense = testKit.docs.getDriverLicense()
            const verifyOtpResponse = {
                requestor: user,
                docId: driverLicense.id,
                ownerType: OwnerType.owner,
                docStatus: DocStatus.NoPhoto,
            }
            const internalPassport = testKit.docs.getInternalPassport()
            const passport = { ...internalPassport, department: 'department' }
            const driverLicenseDto = getDriverLicense()

            jest.spyOn(passportService, 'getPassportsEntityByContext').mockResolvedValueOnce([passport])
            jest.spyOn(driverLicenseHscProvider, 'getDriverLicense').mockResolvedValueOnce(driverLicenseDto)
            jest.spyOn(driverLicenseDataMapper, 'toDocumentInstanceV1').mockReturnValueOnce([driverLicense])
            jest.spyOn(passportService, 'enrichDocumentWithPhoto').mockReturnValueOnce(driverLicense)

            expect(await service.verifyDocument(verifyOtpResponse)).toMatchObject(driverLicense)
            expect(passportService.getPassportsEntityByContext).toHaveBeenCalledWith({}, user)
            expect(driverLicenseHscProvider.getDriverLicense).toHaveBeenCalledWith(user.itn, undefined)
        })

        it('should return driver license', async () => {
            const driverLicense = testKit.docs.getDriverLicense()
            const verifyOtpResponse = {
                requestor: user,
                docId: driverLicense.id,
                ownerType: OwnerType.owner,
                docStatus: DocStatus.Ok,
            }
            const internalPassport = testKit.docs.getInternalPassport()
            const passport = { ...internalPassport, department: 'department' }
            const driverLicenseDto = getDriverLicense()

            jest.spyOn(passportService, 'getPassportsEntityByContext').mockResolvedValueOnce([passport])
            jest.spyOn(driverLicenseHscProvider, 'getDriverLicense').mockResolvedValueOnce(driverLicenseDto)
            jest.spyOn(driverLicenseDataMapper, 'toDocumentInstanceV1').mockReturnValueOnce([driverLicense])

            expect(await service.verifyDocument(verifyOtpResponse)).toMatchObject(driverLicense)
            expect(passportService.getPassportsEntityByContext).toHaveBeenCalledWith({}, user)
            expect(driverLicenseHscProvider.getDriverLicense).toHaveBeenCalledWith(user.itn, undefined)
        })
    })
})
