import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'

import PassportService from '@services/passport'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/getRegistrationInfoFromPassports'

export default class GetRegistrationInfoFromPassports implements AppAction {
    constructor(private readonly passportService: PassportService) {}

    readonly sessionType: SessionType = SessionType.PortalUser

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'getRegistrationInfoFromPassports'

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            session: { user },
        } = args

        const { registrationAddress, koatuu, communityCode } = await this.passportService.getRegistrationInfoFromPassports(user)

        return {
            address: registrationAddress,
            koatuu,
            communityCode,
        }
    }
}
