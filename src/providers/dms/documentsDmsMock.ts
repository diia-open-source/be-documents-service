import { Logger } from '@diia-inhouse/types'

import { passportDmsSuccessResponse } from '@providers/testData/documentsMockData'

import PassportByInnDataMapper from '@dataMappers/passportByInnDataMapper'

import { RegistryPassportsByInn } from '@interfaces/dto/passport'
import { DocumentsDmsServiceProvider } from '@interfaces/providers'
import { PassportByInn } from '@interfaces/providers/dms'

export default class DocumentsDmsMockProvider implements DocumentsDmsServiceProvider {
    constructor(
        private readonly passportByInnDataMapper: PassportByInnDataMapper,
        private readonly logger: Logger,
    ) {
        this.logger.info('Enabled Dms MOCK provider')
    }

    async getPassport(): Promise<PassportByInn> {
        const passports = await this.getPassports()

        return {
            passport: this.passportByInnDataMapper.toEntity(passports),
            registration: this.passportByInnDataMapper.toRegistration(passports),
            registrationV1: this.passportByInnDataMapper.toRegistrationV1(passports),
        }
    }

    private async getPassports(): Promise<RegistryPassportsByInn> {
        return passportDmsSuccessResponse
    }
}
