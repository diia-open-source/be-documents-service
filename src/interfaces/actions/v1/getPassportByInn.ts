import { UserActionArguments } from '@diia-inhouse/types'

import { PassportByInnRegistrationInfo, PassportInfo } from '@interfaces/providers/dms'

export interface CustomActionArguments extends UserActionArguments {
    params: {
        digitalPassportRegistration?: boolean
    }
}

export interface ActionResult {
    passport?: PassportInfo
    registration: PassportByInnRegistrationInfo
}
