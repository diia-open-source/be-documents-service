import { isObject } from 'lodash'

import { ExternalCommunicator, ExternalEvent } from '@diia-inhouse/diia-queue'
import { DocumentNotFoundError, ErrorType } from '@diia-inhouse/errors'
import { Logger } from '@diia-inhouse/types'

import DriverLicenseDataMapper from '@src/documents/driverLicense/dataMappers/document'
import { DriverLicenseHscServiceProvider } from '@src/documents/driverLicense/interfaces/providers'
import { DriverLicenseFull, RegistryDriverLicenseDTO } from '@src/documents/driverLicense/interfaces/providers/hsc'

export default class DriverLicenseHscProvider implements DriverLicenseHscServiceProvider {
    constructor(
        private readonly driverLicenseDataMapper: DriverLicenseDataMapper,

        private readonly external: ExternalCommunicator,
        private readonly logger: Logger,
    ) {
        this.logger.info('Enabled Driver License HSC provider')
    }

    async getDriverLicense(itn: string, ignoreCache?: boolean): Promise<RegistryDriverLicenseDTO> {
        this.logger.info('Start getting Driver license by ITN')

        const response = await this.external.receiveDirect<RegistryDriverLicenseDTO>(
            ExternalEvent.RepoDocumentDriverLicense,
            { rnokpp: itn },
            { ignoreCache },
        )

        if (!isObject(response) || !response.client || !response.driverLicense || !response.clientAddr) {
            throw new DocumentNotFoundError('Driver license was not found in registry by provided itn', undefined, ErrorType.Operated)
        }

        return response
    }

    async getDriverLicenseFull(itn: string): Promise<DriverLicenseFull> {
        const registryDriverLicense: RegistryDriverLicenseDTO = await this.getDriverLicense(itn)

        return this.driverLicenseDataMapper.toFullEntity(registryDriverLicense)
    }
}
