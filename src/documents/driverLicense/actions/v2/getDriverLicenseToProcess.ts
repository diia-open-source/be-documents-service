import { AppAction } from '@diia-inhouse/diia-app'

import { NotFoundError, UnprocessableEntityError } from '@diia-inhouse/errors'
import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import { ActionResult, CustomActionArguments } from '@src/documents/driverLicense/interfaces/actions/v2/getDriverLicenseToProcess'
import DriverLicenseService from '@src/documents/driverLicense/services/document'

export default class GetDriverLicenseToProcessAction implements AppAction {
    constructor(private readonly driverLicenseService: DriverLicenseService) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V2

    readonly name: string = 'getDriverLicenseToProcess'

    readonly validationRules: ValidationSchema = {
        itn: { type: 'string' },
        ignoreCache: { type: 'boolean', optional: true },
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { itn, ignoreCache },
        } = args

        const items = await this.driverLicenseService.getDriverLicenses(itn, undefined, null, ignoreCache)
        if (items.length > 1) {
            throw new UnprocessableEntityError(`Unexpected amount of driver licenses: ${items.length}`)
        }

        const [driverLicense] = items
        if (!driverLicense) {
            throw new NotFoundError('Driver license not found')
        }

        return driverLicense
    }
}
