import { UserActionArguments } from '@diia-inhouse/types'

export interface CustomActionArguments extends UserActionArguments {
    params: {
        unzr: string
    }
}

export interface ActionResult {
    currentRegistrationPlaceUA: string
}
