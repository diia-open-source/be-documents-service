import { UserActionArguments } from '@diia-inhouse/types'

import { GetInternalPassportWithRegistrationRequest, GetInternalPassportWithRegistrationResponse } from '@src/generated'

export interface CustomActionArguments extends UserActionArguments {
    params: GetInternalPassportWithRegistrationRequest
}

export type ActionResult = GetInternalPassportWithRegistrationResponse
