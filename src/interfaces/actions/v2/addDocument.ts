import { ServiceActionArguments } from '@diia-inhouse/types'

export interface CustomActionArguments extends ServiceActionArguments {
    params: {
        userIdentifier: string
        mobileUid: string
        documentType: string
    } & Record<string, Record<string, never>>
}

export interface ProcessCodeResponse {
    processCode: number
}

export type ActionResult = ProcessCodeResponse | undefined
