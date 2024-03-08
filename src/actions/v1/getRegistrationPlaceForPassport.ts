import { AppAction } from '@diia-inhouse/diia-app'

import { BadRequestError, NotFoundError } from '@diia-inhouse/errors'
import { ActionVersion, Logger, PlatformType, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import PassportService from '@services/passport'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/getRegistrationPlaceForPassport'

export default class GetRegistrationPlaceForPassportAction implements AppAction {
    constructor(
        private readonly passportService: PassportService,

        private readonly logger: Logger,
    ) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'getRegistrationPlaceForPassport'

    readonly validationRules: ValidationSchema = {
        unzr: { type: 'string' },
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            session: { user },
            headers: { platformType },
        } = args
        if (platformType === PlatformType.iOS) {
            throw new BadRequestError('Use registration place from passport')
        }

        const currentRegistrationPlaceUA: string = await this.passportService.getRegistrationPlaceForPassport(user)
        if (!currentRegistrationPlaceUA) {
            this.logger.error('Empty currentRegistrationPlaceUA for passport')

            throw new NotFoundError()
        }

        return { currentRegistrationPlaceUA }
    }
}
