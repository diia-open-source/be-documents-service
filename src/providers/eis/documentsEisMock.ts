import { Logger, UserTokenData } from '@diia-inhouse/types'

import { passportEisSuccessResponse } from '@providers/testData/documentsMockData'

import PassportDataMapper from '@dataMappers/passportDataMapper'

import Utils from '@utils/index'

import { RegistryPassportDTO } from '@interfaces/dto/passport'
import { DocumentsEisServiceProvider } from '@interfaces/providers'
import { PassportFull, PassportsRequestData } from '@interfaces/providers/eis'

export default class DocumentsEisMockProvider implements DocumentsEisServiceProvider {
    constructor(
        private readonly passportDataMapper: PassportDataMapper,
        private readonly appUtils: Utils,

        private readonly logger: Logger,
    ) {
        this.logger.info('Enabled Eis MOCK provider')
    }

    async getPassports(): Promise<RegistryPassportDTO> {
        return passportEisSuccessResponse
    }

    async getPassportFull(): Promise<PassportFull> {
        return this.passportDataMapper.toFullEntity(passportEisSuccessResponse)
    }

    collectRequestData(user: UserTokenData): PassportsRequestData {
        return {
            person: this.appUtils.collectPerson(user),
            representative: this.appUtils.collectRepresentative(user),
        }
    }
}
