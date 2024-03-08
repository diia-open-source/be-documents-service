import { DriverLicense, ServiceActionArguments } from '@diia-inhouse/types'

export interface CustomActionArguments extends ServiceActionArguments {
    params: {
        itn: string
        ignoreCache?: boolean
    }
}

export type ActionResult = DriverLicense
