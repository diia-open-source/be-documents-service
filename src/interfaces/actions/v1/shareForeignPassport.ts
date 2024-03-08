import { Localization, UserActionArguments } from '@diia-inhouse/types'

export interface CustomActionArguments extends UserActionArguments {
    params: {
        documentId: string
        localization?: Localization
    }
}
