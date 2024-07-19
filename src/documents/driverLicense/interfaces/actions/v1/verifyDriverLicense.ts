import { AppUserActionHeaders, UserActionArguments } from '@diia-inhouse/types'

import { DriverLicense } from '@src/documents/driverLicense/interfaces/services'

interface ActionHeaders extends AppUserActionHeaders {
    token: string
}

export interface CustomActionArguments extends UserActionArguments<ActionHeaders> {
    params: {
        otp: string
    }
}

export type ActionResult = DriverLicense
