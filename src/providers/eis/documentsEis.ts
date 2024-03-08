import { isObject } from 'lodash'

import { ExternalCommunicator, ExternalEvent } from '@diia-inhouse/diia-queue'
import { ReceiveDirectOps } from '@diia-inhouse/diia-queue/dist/types/interfaces/externalCommunicator'
import {
    AccessDeniedError,
    ApiError,
    DocumentNotFoundError,
    ExternalCommunicatorError,
    ServiceUnavailableError,
} from '@diia-inhouse/errors'
import { HttpStatusCode, Logger, UserTokenData } from '@diia-inhouse/types'

import PassportDataMapper from '@dataMappers/passportDataMapper'

import Utils from '@utils/index'

import { AppConfig } from '@interfaces/config'
import {
    RegistryPassportDTO,
    RegistryPassportResponse,
    RegistryPassportResponseWithStructuredAddress,
    RegistryPassportResponseWithoutStructuredAddress,
} from '@interfaces/dto'
import { DocumentsEisServiceProvider } from '@interfaces/providers'
import { PassportFull, PassportsRequestData, Person, Representative } from '@interfaces/providers/eis'

export default class DocumentsEisProvider implements DocumentsEisServiceProvider {
    private readonly notFoundRnokppRegexp: RegExp = /unauthorized: agreement rnokpp=\d{10} not found/

    constructor(
        private readonly passportDataMapper: PassportDataMapper,
        private readonly appUtils: Utils,

        private readonly config: AppConfig,
        private readonly external: ExternalCommunicator,
        private readonly logger: Logger,
    ) {
        this.logger.info('Enabled Eis provider')
    }

    async getPassports(person: Person, representative: Representative): Promise<RegistryPassportDTO> {
        this.logger.info('Start getting Passports by ITN')

        return await this.getResource({
            addressInStructure: this.config.eis.addressInStructure,
            person,
            representative,
        })
    }

    async getPassportFull(person: Person, representative: Representative): Promise<PassportFull> {
        const passports = await this.getPassports(person, representative)

        return this.passportDataMapper.toFullEntity(passports)
    }

    collectRequestData(user: UserTokenData): PassportsRequestData {
        return {
            addressInStructure: this.config.eis.addressInStructure,
            person: this.appUtils.collectPerson(user),
            representative: this.appUtils.collectRepresentative(user),
        }
    }

    private async getResource(data: PassportsRequestData, ops: ReceiveDirectOps = {}): Promise<RegistryPassportDTO> {
        this.logger.info('Start getting passports')

        try {
            const response: RegistryPassportResponse = await this.external.receiveDirect(ExternalEvent.RepoDocumentPassports, data, ops)

            const responseData = data.addressInStructure
                ? this.processResponseWithStructuredAddress(<RegistryPassportResponseWithStructuredAddress>response, data)
                : this.processResponseWithoutStructuredAddress(<RegistryPassportResponseWithoutStructuredAddress>response, data)

            if (!isObject(response) || !responseData) {
                this.logger.error('Get passports result: error, no eis registry response', { response })
                throw new ServiceUnavailableError('Got empty eis registry response')
            }

            return responseData
        } catch (err) {
            if (err instanceof ExternalCommunicatorError) {
                this.logger.error(`Fetch failed for eis: ${err.getCode()}`, err.getData())

                return this.processResponseError(err, data)
            } else {
                throw err
            }
        }
    }

    private processResponseWithStructuredAddress(
        response: RegistryPassportResponseWithStructuredAddress,
        data: PassportsRequestData,
    ): RegistryPassportDTO {
        if ('code' in response && 'detail' in response) {
            const statusCode = parseInt(response.code)

            this.logger.error('Get passports result: error response', { response })

            return this.processResponseStatus(statusCode, data)
        }

        return response
    }

    private processResponseWithoutStructuredAddress(
        response: RegistryPassportResponseWithoutStructuredAddress,
        data: PassportsRequestData,
    ): RegistryPassportDTO | undefined {
        if (response.error) {
            const statusCode = parseInt(response.error.code)

            this.logger.error('Get passports result: error response', { response })

            return this.processResponseStatus(statusCode, data)
        }

        return response.return
    }

    private processResponseError(error: ApiError, requestData: PassportsRequestData): never {
        let statusCode: HttpStatusCode
        if (this.notFoundRnokppRegexp.test(error?.message)) {
            statusCode = HttpStatusCode.NOT_FOUND
        } else {
            statusCode = error.getCode()
        }

        this.logger.error('Get passports result: error', {
            requestData,
            error: error?.getData(),
            statusCode,
        })

        return this.processResponseStatus(statusCode, requestData)
    }

    private processResponseStatus(statusCode: HttpStatusCode, requestData: PassportsRequestData): never {
        switch (statusCode) {
            case HttpStatusCode.NO_CONTENT:
                throw new DocumentNotFoundError()
            case HttpStatusCode.UNAUTHORIZED:
                throw new ServiceUnavailableError()
            case HttpStatusCode.FORBIDDEN:
                throw new AccessDeniedError()
            case HttpStatusCode.NOT_FOUND:
                throw new DocumentNotFoundError()
            case HttpStatusCode.INTERNAL_SERVER_ERROR:
                throw new ServiceUnavailableError()
            default:
                this.logger.error('Get passports result: error, unknown', { statusCode, requestData })
                throw new ServiceUnavailableError()
        }
    }
}
