import { randomUUID } from 'crypto'

const uuidV4Stub = jest.fn()

jest.mock('uuid', () => ({ v4: uuidV4Stub }))

import { AnalyticsService as CoreAnalyticsService } from '@diia-inhouse/analytics'
import { AuthService } from '@diia-inhouse/crypto'
import Logger from '@diia-inhouse/diia-logger'
import { BadRequestError, DocumentNotFoundError, NotFoundError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocStatus, DocumentType, Localization, OwnerType } from '@diia-inhouse/types'

import AnalyticsService from '@services/analytics'
import DocumentsExpirationService from '@services/documentsExpiration'
import DocumentVerificationService from '@services/documentVerification'
import DocumentVerificationOtpService from '@services/documentVerificationOtp'
import PassportService from '@services/passport'

import DocumentVerificationDataMapper from '@dataMappers/documentVerificationDataMapper'

import PluginDepsCollectionMock, { getDocumentService } from '@mocks/stubs/documentDepsCollection'

import { AppConfig } from '@interfaces/config'
import { DocumentVerificationOtpModel } from '@interfaces/models/documentVerificationOtp'
import { CommonDocument } from '@interfaces/services/documents'
import { AssertParams } from '@interfaces/services/documentVerification'

describe(`Service ${DocumentVerificationService.name}`, () => {
    const now = new Date()
    const logger = mockInstance(Logger)
    const testKit = new TestKit()
    const analyticsService = mockInstance(AnalyticsService, { getDocumentActionTypeByDocumentType: { 'document-type': 'action-type' } })
    const documentsExpirationService = mockInstance(DocumentsExpirationService)
    const documentVerificationOtpService = mockInstance(DocumentVerificationOtpService)
    const mockDocumentService = getDocumentService()
    const documentServices = new PluginDepsCollectionMock([mockDocumentService])
    const passportService = mockInstance(PassportService)
    const documentVerificationDataMapper = mockInstance(DocumentVerificationDataMapper)

    const config = <AppConfig>{
        app: {
            documentVerificationLinkExpirationMS: 10000,
        },
    }
    const auth = mockInstance(AuthService)
    const analytics = mockInstance(CoreAnalyticsService)

    const service = new DocumentVerificationService(
        analyticsService,
        documentServices,
        documentsExpirationService,
        documentVerificationOtpService,
        passportService,
        documentVerificationDataMapper,
        config,
        analytics,
        auth,
        logger,
    )
    const { user } = testKit.session.getUserSession()
    const headers = testKit.session.getHeaders()

    beforeEach(() => {
        jest.useFakeTimers({ now })
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    describe(`method: ${service.generateOtpLink.name}`, () => {
        it('should throw BadRequestError if document expiration record not found', async () => {
            const shareLinkParams = {
                documentType: <DocumentType>'document-type',
                documentId: 'documentId',
                headers,
                userIdentifier: user.identifier,
                documentAssertParams: <AssertParams>{
                    itn: user.itn,
                },
                generateBarcode: false,
                localization: Localization.UA,
            }

            const documentIdsExpiration = { statuses: undefined, date: now }

            jest.spyOn(documentsExpirationService, 'getDocumentIdsExpiration').mockResolvedValueOnce(documentIdsExpiration)

            await expect(service.generateOtpLink(shareLinkParams)).rejects.toThrow(
                new BadRequestError('Firstly request document before sharing'),
            )
            expect(logger.info).toHaveBeenCalledWith('Start generating OTP link', { documentType: shareLinkParams.documentType })
            expect(logger.info).toHaveBeenCalledWith('Start checking is document still valid', {
                documentId: shareLinkParams.documentId,
                documentType: shareLinkParams.documentType,
            })
            expect(documentsExpirationService.getDocumentIdsExpiration).toHaveBeenCalledWith(
                headers.mobileUid,
                user.identifier,
                shareLinkParams.documentType,
            )
            expect(logger.error).toHaveBeenCalledWith('Document expiration record not found', {
                mobileUid: headers.mobileUid,
                documentId: shareLinkParams.documentId,
                documentType: shareLinkParams.documentType,
            })
        })

        it('should throw DocumentNotFoundError if there is no document with given id', async () => {
            const shareLinkParams = {
                documentType: <DocumentType>'document-type',
                documentId: 'documentId',
                headers,
                userIdentifier: user.identifier,
                documentAssertParams: <AssertParams>{
                    itn: user.itn,
                    user,
                },
                generateBarcode: false,
                localization: Localization.UA,
            }

            const documentIdsExpiration = {
                statuses: { documentId: { value: DocStatus.NotConfirmed, ownerType: OwnerType.owner } },
                date: now,
            }

            jest.spyOn(documentsExpirationService, 'getDocumentIdsExpiration').mockResolvedValueOnce(documentIdsExpiration)

            await expect(service.generateOtpLink(shareLinkParams)).rejects.toThrow(
                new DocumentNotFoundError(`There is no document with id ${shareLinkParams.documentId}`),
            )
            expect(logger.info).toHaveBeenCalledWith('Start generating OTP link', { documentType: shareLinkParams.documentType })
            expect(logger.info).toHaveBeenCalledWith('Start checking is document still valid', {
                documentId: shareLinkParams.documentId,
                documentType: shareLinkParams.documentType,
            })
            expect(documentsExpirationService.getDocumentIdsExpiration).toHaveBeenCalledWith(
                headers.mobileUid,
                user.identifier,
                shareLinkParams.documentType,
            )
        })

        it('should throw BadRequestError if assert strategy not defined', async () => {
            const shareLinkParams = {
                documentType: <DocumentType>'wrong-doc-type',
                documentId: 'documentId',
                headers,
                userIdentifier: user.identifier,
                documentAssertParams: <AssertParams>{
                    itn: user.itn,
                    user,
                },
                generateBarcode: false,
                localization: Localization.UA,
            }

            const documentIdsExpiration = {
                statuses: { documentId: { value: DocStatus.Ok, ownerType: OwnerType.owner } },
                date: new Date(),
            }

            documentIdsExpiration.date.setFullYear(now.getFullYear() - 1)

            jest.spyOn(documentsExpirationService, 'getDocumentIdsExpiration').mockResolvedValueOnce(documentIdsExpiration)

            await expect(service.generateOtpLink(shareLinkParams)).rejects.toThrow(
                new BadRequestError(`AssertStrategy for ${shareLinkParams.documentType} is not defined`),
            )
            expect(logger.info).toHaveBeenCalledWith('Start generating OTP link', { documentType: shareLinkParams.documentType })
            expect(documentsExpirationService.getDocumentIdsExpiration).toHaveBeenCalledWith(
                headers.mobileUid,
                user.identifier,
                'wrong-doc-type',
            )
        })

        it('should return generated link with document doc type', async () => {
            const shareLinkParams = {
                documentType: <DocumentType>'document-type',
                documentId: 'documentId',
                headers,
                userIdentifier: user.identifier,
                documentAssertParams: <AssertParams>{ itn: user.itn },
                generateBarcode: false,
                localization: Localization.UA,
            }

            const requestUuid = randomUUID()

            uuidV4Stub.mockReturnValueOnce(requestUuid)

            const documentIdsExpiration = {
                statuses: { documentId: { value: DocStatus.Ok, ownerType: OwnerType.owner } },
                date: new Date(),
            }

            documentIdsExpiration.date.setFullYear(now.getFullYear() - 1)
            jest.spyOn(documentsExpirationService, 'getDocumentIdsExpiration').mockResolvedValueOnce(documentIdsExpiration)

            const model = <DocumentVerificationOtpModel>{ id: 'id', barcode: 'barcode' }

            jest.spyOn(documentVerificationOtpService, 'create').mockResolvedValueOnce(model)
            jest.spyOn(analytics, 'userAcquirerLog').mockReturnValueOnce()

            const docVerificationLink = `https://diia.app/documents/${shareLinkParams.documentType}/${shareLinkParams.documentId}/verify/${requestUuid}`
            const expirationSec = config.app.documentVerificationLinkExpirationMS / 1000

            const result = {
                id: model.id,
                link: docVerificationLink,
                barcode: model.barcode,
                timerText: 'Код діятиме ще',
                timerTime: expirationSec,
            }

            expect(await service.generateOtpLink(shareLinkParams)).toMatchObject(result)
            expect(logger.info).toHaveBeenCalledWith('Start generating OTP link', { documentType: shareLinkParams.documentType })
            expect(logger.info).toHaveBeenCalledWith('Start checking is document still valid', {
                documentId: shareLinkParams.documentId,
                documentType: shareLinkParams.documentType,
            })
            expect(documentsExpirationService.getDocumentIdsExpiration).toHaveBeenCalledWith(
                headers.mobileUid,
                user.identifier,
                shareLinkParams.documentType,
            )
            expect(mockDocumentService.assertDocumentIsValid).toHaveBeenCalledWith({
                documentId: shareLinkParams.documentId,
                documentType: shareLinkParams.documentType,
                ownerType: OwnerType.owner,
                documentAssertParams: { itn: user.itn },
            })
        })

        it('should return generated link with internal passport doc type', async () => {
            const shareLinkParams = {
                documentType: DocumentType.InternalPassport,
                documentId: 'documentId',
                headers,
                userIdentifier: user.identifier,
                documentAssertParams: <AssertParams>{
                    itn: user.itn,
                    user,
                },
                generateBarcode: false,
                localization: Localization.UA,
            }

            const requestUuid = randomUUID()

            uuidV4Stub.mockReturnValueOnce(requestUuid)

            const model = <DocumentVerificationOtpModel>{ id: 'id', barcode: 'barcode' }

            jest.spyOn(documentVerificationOtpService, 'create').mockResolvedValueOnce(model)

            jest.spyOn(analytics, 'userAcquirerLog').mockReturnValueOnce()

            const docVerificationLink = `https://diia.app/documents/${shareLinkParams.documentType}/${shareLinkParams.documentId}/verify/${requestUuid}`
            const expirationSec = config.app.documentVerificationLinkExpirationMS / 1000

            const result = {
                id: model.id,
                link: docVerificationLink,
                barcode: model.barcode,
                timerText: 'Код діятиме ще',
                timerTime: expirationSec,
            }

            expect(await service.generateOtpLink(shareLinkParams)).toMatchObject(result)
            expect(logger.info).toHaveBeenCalledWith('Start generating OTP link', { documentType: shareLinkParams.documentType })
            expect(logger.info).toHaveBeenCalledWith('Data successfully saved to the database', { docVerificationLink })
        })
    })

    describe(`method: ${service.verifyDocument.name}`, () => {
        it('should throw NotFoundError if verification otp not found', async () => {
            const params = {
                otp: 'otp',
                documentType: <DocumentType>'document-type',
                token: 'token',
            }

            jest.spyOn(documentVerificationOtpService, 'findByKey').mockResolvedValueOnce(null)
            jest.spyOn(analytics, 'log').mockReturnValueOnce()

            await expect(service.verifyDocument(params)).rejects.toThrow(new NotFoundError('VerificationOtp is not found'))
            expect(logger.info).toHaveBeenCalledWith('Start verify document', { documentType: params.documentType })
        })

        it('should throw Error if verification strategy not defined', async () => {
            const params = {
                otp: 'otp',
                documentType: <DocumentType>'wrong-type',
                token: 'token',
            }

            const model = <DocumentVerificationOtpModel>{
                documentId: 'docId',
            }

            const verifyOTPResponse = {
                requestor: user,
                docId: 'docId',
                ownerType: OwnerType.owner,
                docStatus: DocStatus.Ok,
            }

            jest.spyOn(documentVerificationOtpService, 'findByKey').mockResolvedValueOnce(model)
            jest.spyOn(documentVerificationOtpService, 'verifyOtp').mockResolvedValueOnce(verifyOTPResponse)

            jest.spyOn(analytics, 'log').mockReturnValueOnce()

            await expect(service.verifyDocument(params)).rejects.toThrow(
                new Error(`VerifyStrategy for ${params.documentType} is not defined`),
            )
            expect(logger.info).toHaveBeenCalledWith('Start verify document', { documentType: params.documentType })
            expect(logger.info).toHaveBeenCalledWith('Unexpected actionType', { documentType: params.documentType })
        })

        it('should return document', async () => {
            const documentType = <DocumentType>'document-type'
            const params = {
                otp: 'otp',
                documentType,
                token: 'token',
            }

            const model = <DocumentVerificationOtpModel>{
                documentId: 'docId',
            }

            const verifyOTPResponse = {
                requestor: user,
                docId: 'docId',
                ownerType: OwnerType.owner,
                docStatus: DocStatus.Ok,
            }

            const verfiyResult = <CommonDocument>{ id: randomUUID() }

            jest.spyOn(documentVerificationOtpService, 'findByKey').mockResolvedValueOnce(model)
            jest.spyOn(documentVerificationOtpService, 'verifyOtp').mockResolvedValueOnce(verifyOTPResponse)
            jest.spyOn(analytics, 'log').mockReturnValueOnce()
            jest.spyOn(mockDocumentService, 'verifyDocument').mockResolvedValueOnce(verfiyResult)

            expect(await service.verifyDocument(params)).toMatchObject(verfiyResult)
            expect(logger.info).toHaveBeenCalledWith('Start verify document', { documentType: params.documentType })
            expect(mockDocumentService.verifyDocument).toHaveBeenCalledWith(verifyOTPResponse, { documentType })
        })
    })

    describe(`method: ${service.verifyDocumentByBarcode.name}`, () => {
        it('should throw BadRequestError if verification strategy not defined', async () => {
            const documentType = <DocumentType>'wrong-type'

            await expect(service.verifyDocumentByBarcode(documentType, 'code')).rejects.toThrow(
                new BadRequestError(`Verify strategy for ${documentType} is not defined`),
            )
            expect(documentVerificationOtpService.verifyOTPByBarcode).toHaveBeenCalledWith('code', '')
        })

        it('should return document by barcode', async () => {
            const documentType = <DocumentType>'document-type'
            const verifyOTPResponse = {
                requestor: user,
                docId: 'docId',
                ownerType: OwnerType.owner,
                docStatus: DocStatus.Ok,
            }

            jest.spyOn(documentVerificationOtpService, 'verifyOTPByBarcode').mockResolvedValueOnce(verifyOTPResponse)

            const result = <CommonDocument>{ id: randomUUID() }

            const verifyDocumentSpy = jest.spyOn(mockDocumentService, 'verifyDocument').mockResolvedValueOnce(result)

            expect(await service.verifyDocumentByBarcode(documentType, 'code')).toMatchObject(result)
            expect(documentVerificationOtpService.verifyOTPByBarcode).toHaveBeenCalledWith('code', '')
            expect(verifyDocumentSpy).toHaveBeenCalledWith(verifyOTPResponse, { documentType })
        })
    })

    describe(`method: ${service.getDocumentByBarcode.name}`, () => {
        it('should throw NotFoundError if verification not found by barcode', async () => {
            jest.spyOn(documentVerificationOtpService, 'findByKey').mockResolvedValueOnce(null)

            await expect(service.getDocumentByBarcode(<DocumentType>'document-type', 'code')).rejects.toThrow(
                new NotFoundError(`Verification not found by barcode: code`),
            )
            expect(documentVerificationOtpService.findByKey).toHaveBeenCalledWith({ barcode: 'code' })
        })

        it('should throw BadRequestError if verification strategy not defined', async () => {
            const documentType = <DocumentType>'wrong-type'

            const model = <DocumentVerificationOtpModel>{
                documentId: 'docId',
            }

            jest.spyOn(documentVerificationOtpService, 'findByKey').mockResolvedValueOnce(model)

            await expect(service.getDocumentByBarcode(documentType, 'code')).rejects.toThrow(
                new BadRequestError(`Verify strategy for ${documentType} is not defined`),
            )
            expect(documentVerificationOtpService.findByKey).toHaveBeenCalledWith({ barcode: 'code' })
        })

        it('should return document by barcode', async () => {
            const documentType = <DocumentType>'document-type'

            const model = <DocumentVerificationOtpModel>{
                documentId: 'docId',
            }

            const otpResponse = {
                requestor: user,
                docId: 'docId',
                ownerType: OwnerType.owner,
                docStatus: DocStatus.Ok,
            }

            jest.spyOn(documentVerificationOtpService, 'findByKey').mockResolvedValueOnce(model)
            jest.spyOn(documentVerificationDataMapper, 'toVerifyOtpResponse').mockResolvedValueOnce(otpResponse)

            const result = <CommonDocument>{ id: randomUUID() }

            jest.spyOn(mockDocumentService, 'verifyDocument').mockResolvedValueOnce(result)

            expect(await service.getDocumentByBarcode(documentType, 'code')).toMatchObject(result)
            expect(documentVerificationOtpService.findByKey).toHaveBeenCalledWith({ barcode: 'code' })
            expect(documentVerificationDataMapper.toVerifyOtpResponse).toHaveBeenCalledWith(model)
        })
    })

    describe(`method: ${service.getValidatedVerificationRecordByBarcode.name}`, () => {
        it('should return verification response by data', async () => {
            const model = <DocumentVerificationOtpModel>(<unknown>{
                registryDocumentType: <DocumentType>'document-type',
                expirationDate: 'expirationDate',
                usedDate: 'usedDate',
                hash: 'hash',
                requestorJWE: 'requestorJWE',
                documentId: 'documentId',
                userIdentifier: user.identifier,
                barcode: 'barcode',
            })

            jest.spyOn(documentVerificationOtpService, 'findByKey').mockResolvedValueOnce(model)
            jest.spyOn(documentVerificationOtpService, 'assertRecordIsValid').mockReturnValueOnce()
            jest.spyOn(auth, 'decodeToken').mockResolvedValueOnce(user)

            const result = {
                isValid: true,
                errorMessage: '',
                verification: {
                    registryDocumentType: model.registryDocumentType,
                    expirationDate: model.expirationDate,
                    usedDate: model.usedDate,
                    barcode: model.barcode,
                    otp: model.hash,
                    requestorJWE: model.requestorJWE,
                    mobileUid: user.mobileUid,
                    birthDay: user.birthDay,
                    firstName: user.fName,
                    middleName: user.mName,
                    lastName: user.lName,
                    documentId: model.documentId,
                    userIdentifier: model.userIdentifier,
                },
            }

            expect(await service.getValidatedVerificationRecordByBarcode('code')).toMatchObject(result)
            expect(documentVerificationOtpService.findByKey).toHaveBeenCalledWith({ barcode: 'code' })
            expect(documentVerificationOtpService.assertRecordIsValid).toHaveBeenCalledWith(model)
        })
    })

    describe(`method: ${service.getValidatedVerificationRecordByOtp.name}`, () => {
        it('should return not valid verification if failed to assert record', async () => {
            const model = <DocumentVerificationOtpModel>(<unknown>{
                registryDocumentType: <DocumentType>'document-type',
                expirationDate: 'expirationDate',
                usedDate: 'usedDate',
                hash: 'hash',
                requestorJWE: 'requestorJWE',
                documentId: 'documentId',
                userIdentifier: user.identifier,
                barcode: 'barcode',
            })

            jest.spyOn(documentVerificationOtpService, 'findByKey').mockResolvedValueOnce(model)
            jest.spyOn(documentVerificationOtpService, 'assertRecordIsValid').mockImplementationOnce(() => {
                throw new BadRequestError('failed to assert record')
            })
            jest.spyOn(auth, 'decodeToken').mockResolvedValueOnce(user)

            const result = {
                isValid: false,
                errorMessage: 'failed to assert record',
                verification: {
                    registryDocumentType: model.registryDocumentType,
                    expirationDate: model.expirationDate,
                    usedDate: model.usedDate,
                    barcode: model.barcode,
                    otp: model.hash,
                    requestorJWE: model.requestorJWE,
                    mobileUid: user.mobileUid,
                    birthDay: user.birthDay,
                    firstName: user.fName,
                    middleName: user.mName,
                    lastName: user.lName,
                    documentId: model.documentId,
                    userIdentifier: model.userIdentifier,
                },
            }

            expect(await service.getValidatedVerificationRecordByOtp('hash')).toMatchObject(result)
            expect(documentVerificationOtpService.findByKey).toHaveBeenCalledWith({ hash: 'hash' })
            expect(documentVerificationOtpService.assertRecordIsValid).toHaveBeenCalledWith(model)
        })
    })
})
