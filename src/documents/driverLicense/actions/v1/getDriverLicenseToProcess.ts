import { AppAction } from '@diia-inhouse/diia-app'

import { NotFoundError, UnprocessableEntityError } from '@diia-inhouse/errors'
import { ActionVersion, DriverLicense, SessionType } from '@diia-inhouse/types'

import { ActionResult, CustomActionArguments } from '@src/documents/driverLicense/interfaces/actions/v1/getDriverLicenseToProcess'
import DriverLicenseService from '@src/documents/driverLicense/services/document'

export default class GetDriverLicenseToProcessAction implements AppAction {
    constructor(private readonly driverLicenseService: DriverLicenseService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'getDriverLicenseToProcess'

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            session: {
                user: { itn },
            },
        } = args

        const items: DriverLicense[] = await this.driverLicenseService.getDriverLicenses(itn, undefined, null)
        if (items.length > 1) {
            throw new UnprocessableEntityError(`Unexpected amount of driver licenses: ${items.length}`)
        }

        const [driverLicense]: DriverLicense[] = items
        if (!driverLicense) {
            throw new NotFoundError('Driver license not found')
        }

        return driverLicense
    }
}
