const generateStub = jest.fn()

jest.mock('ean13-lib', () => ({ Ean13Utils: { generate: generateStub } }))
import moment from 'moment'
import { FilterQuery } from 'mongoose'

import { AuthService, IdentifierService } from '@diia-inhouse/crypto'
import { MongoDBErrorCode } from '@diia-inhouse/db'
import Logger from '@diia-inhouse/diia-logger'
import { ApiError, BadRequestError, ModelNotFoundError, NotFoundError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocumentType, Localization } from '@diia-inhouse/types'

const documentVerificationOtpModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    deleteMany: jest.fn(),
    modelName: 'DocumentVerificationOtp',
}

const documentVerificationOtpArchiveModel = {
    modelName: 'DocumentVerificationOtpArchive',
}

jest.mock('@models/documentVerificationOtp', () => documentVerificationOtpModel)
jest.mock('@models/documentVerificationOtpArchive', () => documentVerificationOtpArchiveModel)

import ArchiveService from '@services/archive'
import DocumentVerificationOtpService from '@services/documentVerificationOtp'

import DocumentVerificationDataMapper from '@dataMappers/documentVerificationDataMapper'

import Utils from '@utils/index'

import { getDocumentVerificationOtpResponse } from '@tests/mocks/stubs/documentVerificationsOtp'

import { AppConfig } from '@interfaces/config'
import { DocumentVerificationOtpModel } from '@interfaces/models/documentVerificationOtp'

describe(`Service ${DocumentVerificationOtpService.name}`, () => {
    const now = new Date()
    const testKit = new TestKit()
    const logger = mockInstance(Logger)
    const archiveService = mockInstance(ArchiveService)
    const utils = new Utils(<AppConfig>{}, logger, new IdentifierService({ salt: 'salt' }))
    const documentVerificationDataMapper = new DocumentVerificationDataMapper(utils, <AuthService>{})

    const service = new DocumentVerificationOtpService(archiveService, utils, documentVerificationDataMapper, logger)
    const { user } = testKit.session.getUserSession()

    beforeEach(() => {
        jest.useFakeTimers({ now })
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    describe(`method: ${service.create.name}`, () => {
        it('should return created document verification otp model', async () => {
            generateStub.mockReturnValue('generated')

            const documentVerificationOtp = getDocumentVerificationOtpResponse(user.identifier, <DocumentType>'document-type')

            jest.spyOn(documentVerificationOtpModel, 'create').mockResolvedValueOnce(documentVerificationOtp)

            expect(await service.create(documentVerificationOtp, true, undefined)).toMatchObject(documentVerificationOtp)
            expect(documentVerificationOtpModel.create).toHaveBeenCalledWith(documentVerificationOtp)
        })

        it('should throw ApiError if error code is different from mongo db duplicate key', async () => {
            const documentVerificationOtp = getDocumentVerificationOtpResponse(user.identifier, <DocumentType>'document-type')

            const err = new ApiError('failed to create a model', 100)

            jest.spyOn(documentVerificationOtpModel, 'create').mockRejectedValueOnce(err)

            await expect(service.create(documentVerificationOtp, false, 1)).rejects.toThrow(err)
        })

        it('should throw ApiError if reached max attempts to create verification otp', async () => {
            const documentVerificationOtp = getDocumentVerificationOtpResponse(user.identifier, <DocumentType>'document-type')

            const err = new ApiError('failed to create a model', MongoDBErrorCode.DuplicateKey)

            jest.spyOn(documentVerificationOtpModel, 'create').mockRejectedValueOnce(err)

            await expect(service.create(documentVerificationOtp, false, 2)).rejects.toThrow(err)
        })
    })

    describe(`method: ${service.findByKey.name}`, () => {
        it('should return document verification otp model by key', async () => {
            const documentVerificationOtp = getDocumentVerificationOtpResponse(user.identifier, <DocumentType>'document-type')

            jest.spyOn(documentVerificationOtpModel, 'findOne').mockResolvedValueOnce(documentVerificationOtp)

            expect(await service.findByKey({ hash: 'hash' })).toMatchObject(documentVerificationOtp)
        })
    })

    describe(`method: ${service.archiveOtps.name}`, () => {
        it('should successfully archive documents', async () => {
            const yesterday = moment().subtract(1, 'days').endOf('day').toString()

            const query: FilterQuery<DocumentVerificationOtpModel> = {
                usedDate: { $exists: true },
                createdAt: { $lte: yesterday },
            }

            jest.spyOn(archiveService, 'archiveDocuments').mockResolvedValueOnce()

            expect(await service.archiveOtps()).toBeUndefined()
            expect(archiveService.archiveDocuments).toHaveBeenCalledWith(
                documentVerificationOtpModel,
                documentVerificationOtpArchiveModel,
                query,
            )
        })
    })

    describe(`method: ${service.deleteUnusedOtps.name}`, () => {
        it('should return undefined if unused otp not found', async () => {
            const totalUnusedOtps = 0

            jest.spyOn(documentVerificationOtpModel, 'find').mockReturnThis()
            jest.spyOn(documentVerificationOtpModel, 'countDocuments').mockResolvedValueOnce(totalUnusedOtps)

            expect(await service.deleteUnusedOtps()).toBeUndefined()
            expect(logger.info).toHaveBeenCalledWith(`Found [${totalUnusedOtps}] unused otps for remove`)
            expect(logger.debug).toHaveBeenCalledWith('No unused otp to delete')
        })

        it('should successfully remove unused otp', async () => {
            const totalUnusedOtps = 1

            jest.spyOn(documentVerificationOtpModel, 'find').mockReturnThis()
            jest.spyOn(documentVerificationOtpModel, 'countDocuments').mockResolvedValueOnce(totalUnusedOtps)
            jest.spyOn(documentVerificationOtpModel, 'deleteMany').mockResolvedValueOnce({ deletedCount: 1 })

            expect(await service.deleteUnusedOtps()).toBeUndefined()
            expect(logger.info).toHaveBeenCalledWith(`Found [${totalUnusedOtps}] unused otps for remove`)
            expect(logger.info).toHaveBeenCalledWith(`Successfully deleted not used otps [${1}]`)
        })
    })

    describe(`method: ${service.verifyOtp.name}`, () => {
        it('should throw NotFoundError if record is undefined', async () => {
            const record = <DocumentVerificationOtpModel>(<unknown>undefined)

            await expect(service.verifyOtp(record, 'token', <DocumentType>'document-type')).rejects.toThrow(
                new NotFoundError('No record with presented code!'),
            )
            expect(logger.debug).toHaveBeenCalledWith('OTP record', record)
        })

        it('should throw BadRequestError if this code has been used already', async () => {
            const documentVerificationOtp = getDocumentVerificationOtpResponse(user.identifier, <DocumentType>'document-type')

            const record = <DocumentVerificationOtpModel>{ ...documentVerificationOtp, consumerJWE: 'consumerJWE' }

            await expect(service.verifyOtp(record, 'token', <DocumentType>'document-type')).rejects.toThrow(
                new BadRequestError('This code has been used already!'),
            )
            expect(logger.debug).toHaveBeenCalledWith('OTP record', record)
        })

        it('should throw BadRequestError if given wrong doc type', async () => {
            const documentVerificationOtp = getDocumentVerificationOtpResponse(user.identifier, <DocumentType>'document-type')

            const record = <DocumentVerificationOtpModel>documentVerificationOtp

            await expect(service.verifyOtp(record, 'token', DocumentType.InternalPassport)).rejects.toThrow(
                new BadRequestError(`Document type must be ${DocumentType.InternalPassport}`),
            )
            expect(logger.debug).toHaveBeenCalledWith('OTP record', record)
        })

        it('should throw BadRequestError if code has been expired', async () => {
            const expirationDate = new Date()

            expirationDate.setFullYear(new Date().getFullYear() - 1)

            const documentVerificationOtp = getDocumentVerificationOtpResponse(
                user.identifier,
                <DocumentType>'document-type',
                expirationDate,
            )

            const record = <DocumentVerificationOtpModel>documentVerificationOtp

            await expect(service.verifyOtp(record, 'token', <DocumentType>'document-type')).rejects.toThrow(
                new BadRequestError('Code has been expired!', { now, expirationDate: record.expirationDate }),
            )
            expect(logger.debug).toHaveBeenCalledWith('OTP record', record)
            expect(logger.info).toHaveBeenCalledWith('Verify code was expired', {
                now,
                otpExpiration: record.expirationDate,
                isExpired: true,
            })
        })

        it('should return verify otp response', async () => {
            const expirationDate = new Date()

            expirationDate.setFullYear(new Date().getFullYear() + 1)

            const documentVerificationOtp = getDocumentVerificationOtpResponse(
                user.identifier,
                <DocumentType>'document-type',
                expirationDate,
            )

            const record = <DocumentVerificationOtpModel>(<unknown>documentVerificationOtp)

            record.save = jest.fn()

            const data = {
                requestor: user,
                docId: documentVerificationOtp.documentId,
                ownerType: documentVerificationOtp.ownerType,
                docStatus: documentVerificationOtp.docStatus,
                localization: Localization.UA,
            }

            jest.spyOn(documentVerificationDataMapper, 'toVerifyOtpResponse').mockResolvedValueOnce(data)

            expect(await service.verifyOtp(record, 'token', <DocumentType>'document-type')).toMatchObject(data)
            expect(logger.debug).toHaveBeenCalledWith('OTP record', record)
            expect(logger.info).toHaveBeenCalledWith('OTP successfully verified', record)
        })
    })

    describe(`method: ${service.verifyOTPByBarcode.name}`, () => {
        it('should throw ModelNotFoundError if record not found by barcode', async () => {
            jest.spyOn(documentVerificationOtpModel, 'findOne').mockResolvedValueOnce(undefined)

            await expect(service.verifyOTPByBarcode('barcode', 'token')).rejects.toThrow(
                new ModelNotFoundError('DocumentVerificationOtp', 'No otp record with presented barcode!'),
            )
        })

        it('should return otp model by barcode', async () => {
            const expirationDate = new Date()

            expirationDate.setFullYear(new Date().getFullYear() + 1)
            const documentVerificationOtp = getDocumentVerificationOtpResponse(
                user.identifier,
                <DocumentType>'document-type',
                expirationDate,
            )

            const record = <DocumentVerificationOtpModel>(<unknown>documentVerificationOtp)

            record.save = jest.fn()

            jest.spyOn(documentVerificationOtpModel, 'findOne').mockResolvedValueOnce(documentVerificationOtp)

            const data = {
                requestor: user,
                docId: documentVerificationOtp.documentId,
                ownerType: documentVerificationOtp.ownerType,
                docStatus: documentVerificationOtp.docStatus,
                localization: Localization.UA,
            }

            jest.spyOn(documentVerificationDataMapper, 'toVerifyOtpResponse').mockResolvedValueOnce(data)

            expect(await service.verifyOTPByBarcode('barcode', 'token')).toMatchObject(data)
            expect(logger.debug).toHaveBeenCalledWith('OTP record', documentVerificationOtp)
            expect(logger.info).toHaveBeenCalledWith('OTP successfully verified', documentVerificationOtp)
        })
    })
})
