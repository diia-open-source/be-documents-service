import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import PassportService from '@services/passport'

import PassportByInnDataMapper from '@dataMappers/passportByInnDataMapper'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/getPassportByInn'

export default class GetPassportByInnAction implements AppAction {
    constructor(
        private readonly passportService: PassportService,
        private readonly passportByInnDataMapper: PassportByInnDataMapper,
    ) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'getPassportByInn'

    readonly validationRules: ValidationSchema<CustomActionArguments['params']> = {
        digitalPassportRegistration: { type: 'boolean', optional: true },
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { digitalPassportRegistration = false },
            session: { user },
        } = args

        const [{ passport, registrationV1 }, passportRegistration] = await Promise.all([
            this.passportService.getPassportByInn(user),
            digitalPassportRegistration && this.passportService.getRegistration(user, ['passport']),
        ])

        return {
            passport,
            registration: passportRegistration
                ? this.passportByInnDataMapper.toPassportByInnRegistrationFromPassportRegistration(passportRegistration)
                : registrationV1,
        }
    }
}
