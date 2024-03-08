import { ExternalCommunicator, ExternalEvent } from '@diia-inhouse/diia-queue'
import { NotFoundError } from '@diia-inhouse/errors'
import { Logger } from '@diia-inhouse/types'

import PassportByInnDataMapper from '@dataMappers/passportByInnDataMapper'

import { RegistryPassportsByInn } from '@interfaces/dto'
import { PassportsByInnRequest, PassportsByInnResponse } from '@interfaces/externalEventListeners/repoDocumentPassportsByInn'
import { DocumentsDmsServiceProvider } from '@interfaces/providers'
import { PassportByInn, PassportByInnRequester } from '@interfaces/providers/dms'

export default class DocumentsDmsProvider implements DocumentsDmsServiceProvider {
    constructor(
        private readonly logger: Logger,
        private readonly external: ExternalCommunicator,
        private readonly passportByInnDataMapper: PassportByInnDataMapper,
    ) {
        this.logger.info('Enabled Dms provider')
    }

    async getPassport(user: PassportByInnRequester): Promise<PassportByInn> {
        const passports: RegistryPassportsByInn = await this.getPassports(user)

        return {
            passport: this.passportByInnDataMapper.toEntity(passports),
            registration: this.passportByInnDataMapper.toRegistration(passports),
            registrationV1: this.passportByInnDataMapper.toRegistrationV1(passports),
        }
    }

    private async getPassports(user: PassportByInnRequester): Promise<RegistryPassportsByInn> {
        const { itn, fName, lName, mName } = user

        this.logger.info('Get passports by inn')

        try {
            const request: PassportsByInnRequest = {
                first_name: fName,
                last_name: lName,
                middle_name: mName?.trim() || '',
                inn: itn,
            }
            const response = await this.external.receive<PassportsByInnResponse>(ExternalEvent.RepoDocumentPassportsByInn, request)

            if (!response) {
                this.logger.error('Unexpected error caused')

                throw new Error('Unexpected error in passport response')
            }

            if (response.success === 404) {
                throw new NotFoundError('Passport not found')
            }

            if (response.success !== 200) {
                this.logger.error('Unsuccessful response for passport by inn', { response })

                throw new Error('Unsuccessful passport response')
            }

            if ('error' in response.return) {
                this.logger.error('Unexpected error in success response for passports by inn', { response })

                throw new Error('Unexpected error in passport response')
            }

            return response.return
        } catch (err) {
            this.logger.error('Failed to receive passports by inn', { err })

            throw err
        }
    }
}
