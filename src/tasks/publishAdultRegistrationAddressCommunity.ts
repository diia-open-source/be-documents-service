import { EventBus, InternalEvent, TaskListener } from '@diia-inhouse/diia-queue'
import { StoreService } from '@diia-inhouse/redis'
import { Gender, HttpStatusCode, Logger } from '@diia-inhouse/types'
import { utils } from '@diia-inhouse/utils'
import { ValidationSchema } from '@diia-inhouse/validators'

import PassportService from '@services/passport'

import { PassportByInn, PassportByInnRequester } from '@interfaces/providers/dms'
import { ServiceTask } from '@interfaces/tasks'
import { EventPayload } from '@interfaces/tasks/publishAdultRegistrationAddressCommunity'

export default class PublishAdultRegistrationAddressCommunityTask implements TaskListener {
    constructor(
        private readonly passportService: PassportService,

        private readonly store: StoreService,
        private readonly eventBus: EventBus,
        private readonly logger: Logger,
    ) {}

    readonly name: string = ServiceTask.PublishAdultRegistrationAddressCommunity

    readonly validationRules: ValidationSchema<EventPayload> = {
        userIdentifier: { type: 'string' },
        itn: { type: 'string' },
        fName: { type: 'string' },
        lName: { type: 'string' },
        mName: { type: 'string' },
        birthDay: { type: 'string' },
        gender: { type: 'string', enum: Object.values(Gender) },
        koatuu: { type: 'string', optional: true },
        communityKodificatorCode: { type: 'string', optional: true },
    }

    async handler(payload: EventPayload): Promise<void> {
        const { userIdentifier } = payload

        const eventName = InternalEvent.DocumentsAdultRegistrationAddressCommunity
        const key = `${eventName}.${userIdentifier}`
        if (await this.store.get(key)) {
            this.logger.info(`Skip publish [${eventName}]`)

            return
        }

        const success = await this.publish(eventName, payload)
        if (success) {
            await this.store.set(key, '1', { ttl: 24 * 3600 * 1000 })
        }
    }

    private async publish(eventName: InternalEvent, payload: EventPayload): Promise<boolean> {
        const { userIdentifier, itn, lName, fName, mName, birthDay, gender, koatuu, communityKodificatorCode } = payload

        if (koatuu || communityKodificatorCode) {
            return await this.eventBus.publish(eventName, {
                userIdentifier,
                lName,
                fName,
                mName,
                birthDay,
                gender,
                koatuu,
                communityKodificatorCode,
            })
        }

        let passportResponse: PassportByInn
        try {
            const user: PassportByInnRequester = { itn, lName, fName, mName }

            passportResponse = await this.passportService.getPassportByInn(user)
        } catch (err) {
            return utils.handleError(err, (apiError) => {
                this.logger.error('Failed to get passports by inn', { err, userIdentifier })

                return apiError.getCode() === HttpStatusCode.NOT_FOUND
            })
        }

        const { address, registrationDate } = passportResponse.registration
        if (!registrationDate) {
            this.logger.info("User doesn't have registration", { userIdentifier })

            return true
        }

        return await this.eventBus.publish(eventName, {
            userIdentifier,
            lName,
            fName,
            mName,
            birthDay,
            gender,
            koatuu: address?.addressKoatuu,
            communityKodificatorCode: address?.addressGromKatottg,
        })
    }
}
