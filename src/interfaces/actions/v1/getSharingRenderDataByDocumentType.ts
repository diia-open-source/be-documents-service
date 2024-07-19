import { GenericData, ServiceActionArguments } from '@diia-inhouse/types'

export interface CustomActionArguments extends ServiceActionArguments {
    params: {
        documentType: string
        data: unknown
        requester: string
        requestDateTime: string
        requestIdentifier: string
    }
}

export type ActionResult = GenericData
