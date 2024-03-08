import { UserActionArguments } from '@diia-inhouse/types'

import { PassportRegistrationInfo } from '@src/generated'

export type CustomActionArguments = UserActionArguments

export interface ActionResult {
    registration?: PassportRegistrationInfo
}
