import { Logger } from '@diia-inhouse/types'

import DriverLicenseDataMapper from '@src/documents/driverLicense/dataMappers/document'
import { DriverLicenseHscServiceProvider } from '@src/documents/driverLicense/interfaces/providers'
import { DriverLicenseFull, RegistryDriverLicenseDTO } from '@src/documents/driverLicense/interfaces/providers/hsc'
import { driverLicenseHSCSuccessResponse } from '@src/documents/driverLicense/providers/hsc/mockData'

export default class DriverLicenseHscMockProvider implements DriverLicenseHscServiceProvider {
    constructor(
        private readonly driverLicenseDataMapper: DriverLicenseDataMapper,

        private readonly logger: Logger,
    ) {
        this.logger.info('Enabled Driver License HSC MOCK provider')
    }

    async getDriverLicense(): Promise<RegistryDriverLicenseDTO> {
        return driverLicenseHSCSuccessResponse
    }

    async getDriverLicenseFull(): Promise<DriverLicenseFull> {
        return this.driverLicenseDataMapper.toFullEntity(driverLicenseHSCSuccessResponse)
    }
}
