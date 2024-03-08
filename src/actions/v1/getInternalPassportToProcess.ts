import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'

import PassportService from '@services/passport'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/getInternalPassportToProcess'

export default class GetInternalPassportToProcessAction implements AppAction {
    constructor(private readonly passportService: PassportService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'getInternalPassportToProcess'

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            session: { user },
        } = args

        return await this.passportService.getInternalPassportToProcess(user)
    }
}
