import { UserActionArguments } from '@diia-inhouse/types'

export interface CustomActionArguments extends UserActionArguments {
    params: {
        handlePhoto?: boolean
    }
}

export interface ActionResult {
    exists: boolean
}
