import { ServiceActionArguments } from '@diia-inhouse/types'

import { DriverLicense } from '@src/documents/driverLicense/interfaces/services'

export interface CustomActionArguments extends ServiceActionArguments {
    params: {
        itn: string
        ignoreCache?: boolean
    }
}

export type ActionResult = DriverLicense
