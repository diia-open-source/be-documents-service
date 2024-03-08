import { Ean13Utils } from 'ean13-lib'
import moment from 'moment'
import { FilterQuery } from 'mongoose'

import { MongoDBErrorCode } from '@diia-inhouse/db'
import { BadRequestError, ModelNotFoundError, NotFoundError } from '@diia-inhouse/errors'
import { DocumentType, Logger } from '@diia-inhouse/types'
import { utils } from '@diia-inhouse/utils'

import ArchiveService from '@services/archive'

import documentVerificationOtpModel from '@models/documentVerificationOtp'
import documentVerificationOtpArchiveModel from '@models/documentVerificationOtpArchive'

import DocumentVerificationDataMapper from '@dataMappers/documentVerificationDataMapper'

import Utils from '@utils/index'

import { DocumentVerificationOtp, DocumentVerificationOtpModel } from '@interfaces/models/documentVerificationOtp'
import { VerifyOtpResponse } from '@interfaces/services/documentVerification'

export default class DocumentVerificationOtpService {
    private readonly maxAttemptsToCreateVerificationOtp: number = 2

    constructor(
        private readonly archiveService: ArchiveService,
        private readonly appUtils: Utils,
        private readonly documentVerificationDataMapper: DocumentVerificationDataMapper,
        private readonly logger: Logger,
    ) {}

    async create(
        documentVerificationOtp: DocumentVerificationOtp,
        generateBarcode: boolean,
        retriesOnDuplicate = 0,
    ): Promise<DocumentVerificationOtpModel> {
        try {
            if (generateBarcode) {
                // eslint-disable-next-line no-param-reassign
                documentVerificationOtp.barcode = this.generateBarcode()
            }

            return await documentVerificationOtpModel.create(documentVerificationOtp)
        } catch (err) {
            return await utils.handleError(err, async (apiError) => {
                if (apiError.getCode() !== MongoDBErrorCode.DuplicateKey) {
                    throw err
                }

                if (retriesOnDuplicate >= this.maxAttemptsToCreateVerificationOtp) {
                    throw apiError
                }

                return await this.create(documentVerificationOtp, generateBarcode, retriesOnDuplicate + 1)
            })
        }
    }

    async findByKey(query: FilterQuery<DocumentVerificationOtpModel>): Promise<DocumentVerificationOtpModel | null> {
        return await documentVerificationOtpModel.findOne(query)
    }

    async archiveOtps(): Promise<void> {
        const query: FilterQuery<DocumentVerificationOtpModel> = {
            usedDate: { $exists: true },
            createdAt: { $lte: this.getYesterday() },
        }

        await this.archiveService.archiveDocuments(documentVerificationOtpModel, documentVerificationOtpArchiveModel, query)
    }

    async deleteUnusedOtps(): Promise<unknown> {
        const totalUnusedOtps: number = await this.totalUnusedOtps()

        this.logger.info(`Found [${totalUnusedOtps}] unused otps for remove`)

        if (!totalUnusedOtps) {
            return this.logger.debug('No unused otp to delete')
        }

        await this.removeAllUnusedOtps()
    }

    async verifyOtp(record: DocumentVerificationOtpModel, token: string, docType: DocumentType): Promise<VerifyOtpResponse> | never {
        this.logger.debug('OTP record', record)
        this.assertRecordIsValid(record, docType)
        this.logger.info('OTP successfully verified', record)

        record.usedDate = new Date()
        record.consumerJWE = token

        await record.save()

        return await this.documentVerificationDataMapper.toVerifyOtpResponse(record)
    }

    async verifyOTPByBarcode(barcode: string, token: string): Promise<VerifyOtpResponse | never> {
        const record = await this.findByKey({ barcode })
        if (!record) {
            throw new ModelNotFoundError('DocumentVerificationOtp', 'No otp record with presented barcode!')
        }

        return await this.verifyOtp(record, token, record.registryDocumentType)
    }

    assertRecordIsValid(record: DocumentVerificationOtpModel | undefined | null, docType?: DocumentType): never | void {
        if (!record) {
            throw new NotFoundError('No record with presented code!')
        }

        if (record.usedDate || record.consumerJWE) {
            throw new BadRequestError('This code has been used already!')
        }

        if (docType && docType !== record.registryDocumentType) {
            throw new BadRequestError(`Document type must be ${docType}`)
        }

        const now: Date = new Date(Date.now())
        const isExpired: boolean = now > record.expirationDate

        this.logger.info('Verify code was expired', { now, otpExpiration: record.expirationDate, isExpired })

        if (isExpired) {
            throw new BadRequestError('Code has been expired!', { now, expirationDate: record.expirationDate })
        }
    }

    private async totalUnusedOtps(): Promise<number> {
        return await documentVerificationOtpModel
            .find({
                usedDate: { $exists: false },
                createdAt: { $lte: this.getYesterday() },
            })
            .countDocuments()
    }

    private async removeAllUnusedOtps(): Promise<void> {
        const { deletedCount } = await documentVerificationOtpModel.deleteMany({
            usedDate: { $exists: false },
            createdAt: { $lte: this.getYesterday() },
        })

        this.logger.info(`Successfully deleted not used otps [${deletedCount}]`)
    }

    private getYesterday(): string {
        return moment().subtract(1, 'days').endOf('day').toString()
    }

    private generateBarcode(): string {
        const baseNumber: number = this.appUtils.generateRandomNumber(100000000000, 999999999999)

        return Ean13Utils.generate(baseNumber.toString()).toString()
    }
}
