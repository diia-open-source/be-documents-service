import { UserActionArguments } from '@diia-inhouse/types'

import { GetPassportToProcessRequest, GetPassportToProcessResponse } from '@src/generated'

export interface CustomActionArguments extends UserActionArguments {
    params: GetPassportToProcessRequest
}

export type ActionResult = GetPassportToProcessResponse
