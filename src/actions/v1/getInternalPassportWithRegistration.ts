import { GrpcAppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import PassportService from '@services/passport'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/getInternalPassportWithRegistration'

export default class GetInternalPassportWithRegistrationAction implements GrpcAppAction {
    constructor(private readonly passportService: PassportService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'getInternalPassportWithRegistration'

    readonly validationRules: ValidationSchema<CustomActionArguments['params']> = {
        digitalPassportRegistration: { type: 'boolean', optional: true },
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { digitalPassportRegistration = false },
            session: { user },
        } = args

        const [{ passport, registration }, passportRegistration] = await Promise.all([
            this.passportService.getPassportByInn(user),
            digitalPassportRegistration && this.passportService.getRegistration(user, ['passport']),
        ])

        return {
            passport,
            registration: passportRegistration || registration,
        }
    }
}
